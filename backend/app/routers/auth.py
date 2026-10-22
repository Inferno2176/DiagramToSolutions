from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_
import secrets
import hashlib
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.database import get_db
from app.models import User, PasswordResetToken
from app.schemas import (
    UserCreate,
    UserLogin,
    UserResponse,
    Token,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyTokenResponse,
    MessageResponse
)
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user
from app.services.rate_limiter import enforce_rate_limit
from app.services.email_service import (
    send_password_reset_email,
    send_password_changed_notification,
    get_latest_dev_email
)
from app.config import PASSWORD_RESET_TOKEN_EXPIRE_MINUTES, EMAIL_DEV_MODE, SMTP_HOST

router = APIRouter(tags=["auth"])


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def validate_password_complexity(password: str):
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )
    if not re.search(r"[A-Za-z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one letter."
        )
    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one number."
        )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # 1. Normalize username and email
    norm_username = user_in.username.strip()
    norm_email = user_in.email.strip().lower() if user_in.email else None
    if not norm_email:
        if "@" in norm_username:
            norm_email = norm_username.lower()
        else:
            norm_email = f"{norm_username.lower()}@local.dev"
            
    # 2. Check if username or email already exists
    existing = db.query(User).filter(
        or_(
            User.username.ilike(norm_username),
            User.email == norm_email
        )
    ).first()
    
    if existing:
        if existing.username.lower() == norm_username.lower():
            detail = "Username is already registered"
        else:
            detail = "Email address is already registered"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )
    
    # 3. Securely hash password using bcrypt
    hashed_pwd = get_password_hash(user_in.password)
    
    # 4. Create new User with clean normalized fields
    new_user = User(
        username=norm_username,
        email=norm_email,
        name=user_in.name.strip() if user_in.name else norm_username,
        password_hash=hashed_pwd,
        hashed_password=hashed_pwd,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/token", response_model=Token)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    identifier = form_data.username.strip()
    user = db.query(User).filter(
        or_(
            User.username.ilike(identifier),
            User.email == identifier.lower()
        )
    ).first()
    
    stored_hash = user.password_hash or user.hashed_password if user else ""
    if not user or not verify_password(form_data.password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    access_token = create_access_token(data={"sub": user.username, "user_id": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/login", response_model=Token)
def login_json(credentials: UserLogin, db: Session = Depends(get_db)):
    identifier = (credentials.username or credentials.email or "").strip()
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is required"
        )
        
    user = db.query(User).filter(
        or_(
            User.username.ilike(identifier),
            User.email == identifier.lower()
        )
    ).first()
    
    stored_hash = user.password_hash or user.hashed_password if user else ""
    if not user or not verify_password(credentials.password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
        
    access_token = create_access_token(data={"sub": user.username, "user_id": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# =========================================================================
# Password Reset Endpoints
# =========================================================================

@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(req: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """
    Initiate a secure password reset flow.
    Applies rate limiting, generates an unguessable single-use token,
    hashes the token before database persistence, and dispatches the reset email.
    Always returns a generic success response to mitigate account enumeration.
    """
    raw_email = req.email.strip()
    if not raw_email or "@" not in raw_email or "." not in raw_email.split("@")[-1]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address."
        )

    norm_email = raw_email.lower()
    client_ip = get_client_ip(request)

    # 1. Enforce Rate Limiting (per IP and per email target)
    enforce_rate_limit(f"forgot_ip:{client_ip}", max_requests=5, window_seconds=900, action_name="password reset requests")
    enforce_rate_limit(f"forgot_email:{norm_email}", max_requests=3, window_seconds=900, action_name="requests for this email")

    # 2. Look up user by email or matching username
    user = db.query(User).filter(
        or_(
            User.email == norm_email,
            User.username.ilike(norm_email)
        )
    ).first()

    dev_token_for_response = None

    if user and user.is_active:
        # Invalidate any existing unused reset tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False
        ).update({"is_used": True})

        # Generate cryptographically secure random token (32 URL-safe bytes)
        raw_token = secrets.token_urlsafe(32)
        # Store only SHA-256 hash in database
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

        token_record = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            is_used=False,
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent", "")[:255]
        )
        db.add(token_record)
        db.commit()

        # Send reset email
        target_email = user.email or norm_email
        target_name = user.name or user.username
        send_password_reset_email(
            to_email=target_email,
            recipient_name=target_name,
            raw_token=raw_token,
            expires_in_minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
        )

        if EMAIL_DEV_MODE and not SMTP_HOST:
            dev_token_for_response = raw_token
    else:
        # Perform constant-time dummy work to mitigate timing side-channel attacks
        time.sleep(0.06)

    # Generic success message prevents account enumeration
    return {
        "message": "If an account exists for that email address, instructions to reset your password will be sent shortly.",
        "detail": "Please check your inbox or spam folder.",
        "dev_token": dev_token_for_response
    }


@router.get("/verify-reset-token", response_model=VerifyTokenResponse)
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    """
    Validate that a given reset token is genuine, active, not consumed, and unexpired.
    """
    if not token or not token.strip():
        return {"valid": False, "reason": "invalid"}

    token_hash = hashlib.sha256(token.strip().encode("utf-8")).hexdigest()
    record = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).first()

    if not record:
        return {"valid": False, "reason": "invalid"}

    if record.is_used:
        return {"valid": False, "reason": "used"}

    # Timezone-aware expiration comparison
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        return {"valid": False, "reason": "expired"}

    return {"valid": True, "reason": None}


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(req: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """
    Validate reset token and update user's password hash in an atomic transaction.
    Invalidates consumed token and any other outstanding reset tokens for the user.
    """
    client_ip = get_client_ip(request)
    enforce_rate_limit(f"reset_confirm_ip:{client_ip}", max_requests=8, window_seconds=900, action_name="password reset attempts")

    # 1. Validate inputs
    if not req.token or not req.token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token is required."
        )

    if req.new_password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The new password and confirmation password do not match."
        )

    validate_password_complexity(req.new_password)

    # 2. Compute token hash
    token_hash = hashlib.sha256(req.token.strip().encode("utf-8")).hexdigest()

    # 3. Locate and verify token record atomically
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash
    ).with_for_update().first()

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link. Please request a new one."
        )

    if token_record.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link has already been used. Please request a new one."
        )

    expires_at = token_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link has expired. Please request a new one."
        )

    # 4. Fetch associated user
    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Associated account is inactive or not found."
        )

    # 5. Hash new password with existing bcrypt mechanism
    new_hashed_pwd = get_password_hash(req.new_password)

    # 6. Atomic database update
    user.password_hash = new_hashed_pwd
    user.hashed_password = new_hashed_pwd
    user.updated_at = datetime.now(timezone.utc)

    token_record.is_used = True
    token_record.used_at = datetime.now(timezone.utc)

    # Invalidate any other active reset tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.id != token_record.id
    ).update({"is_used": True})

    db.commit()

    # 7. Send password changed confirmation notification
    send_password_changed_notification(
        to_email=user.email or user.username,
        recipient_name=user.name or user.username
    )

    return {
        "message": "Your password has been successfully reset. You may now sign in with your new password.",
        "detail": "All previous password reset links have been invalidated."
    }


@router.get("/dev/latest-reset-email")
def dev_latest_email(email: Optional[str] = None):
    """
    Local development inspection endpoint to view the latest generated reset email.
    Disabled when EMAIL_DEV_MODE is false or when running in production.
    """
    if not EMAIL_DEV_MODE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dev endpoint unavailable")

    record = get_latest_dev_email(email)
    if not record:
        return {"found": False, "message": "No development emails found."}
    return {"found": True, "email": record}
