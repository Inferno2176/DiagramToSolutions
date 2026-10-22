from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# --- Auth Schemas ---

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    name: Optional[str] = Field(None, max_length=255)
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    name: Optional[str] = None
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[UserResponse] = None

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., max_length=255)

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

class VerifyTokenResponse(BaseModel):
    valid: bool
    reason: Optional[str] = None

class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None
    dev_token: Optional[str] = None  # Included only in local dev mode when configured


# --- Project Schemas ---

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    user_id: int
    name: str
    description: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    diagrams_count: Optional[int] = 0

    class Config:
        from_attributes = True


# --- Diagram Schemas ---

class DiagramListItem(BaseModel):
    id: str
    filename: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    architecture_name: Optional[str] = None
    architecture_type: Optional[str] = None

    class Config:
        from_attributes = True

class DiagramDetailResponse(BaseModel):
    id: str
    filename: str
    status: str
    ocr_text: Optional[str] = None
    ocr_json: Optional[Any] = None
    analysis_json: Optional[Any] = None
    architecture_summary: Optional[str] = None
    workflow_explanation: Optional[str] = None
    tech_stack: Optional[Any] = None
    components: Optional[List[Dict[str, Any]]] = None
    suggested_apis: Optional[List[Dict[str, Any]]] = None
    database_entities: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    architecture_name: Optional[str] = None
    architecture_type: Optional[str] = None

    class Config:
        from_attributes = True


# --- Dashboard Stats Schemas ---

class DashboardStats(BaseModel):
    total_uploads: int
    total_analyses: int
    completed_analyses: int
    processing: int
    failed: int
    recent_projects: List[DiagramListItem]
