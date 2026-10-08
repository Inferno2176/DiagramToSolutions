from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserLogin, UserResponse, Token
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(tags=["auth"])

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
