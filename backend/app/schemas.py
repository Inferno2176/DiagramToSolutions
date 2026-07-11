from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# --- Auth Schemas ---

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

class UserResponse(BaseModel):
    id: int
    username: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None


# --- Diagram Schemas ---

class DiagramListItem(BaseModel):
    id: str
    filename: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None

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

    class Config:
        from_attributes = True


# --- Dashboard Stats Schemas ---

class DashboardStats(BaseModel):
    total_uploads: int
    completed_analyses: int
    recent_projects: List[DiagramListItem]
