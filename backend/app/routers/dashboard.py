from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database import get_db
from app.models import Diagram, User
from app.schemas import DashboardStats, DiagramListItem
from app.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total_uploads = db.query(Diagram).filter(Diagram.user_id == current_user.id).count()
    completed_analyses = db.query(Diagram).filter(
        Diagram.user_id == current_user.id,
        Diagram.status == "COMPLETED"
    ).count()
    recent_projects = db.query(Diagram).filter(
        Diagram.user_id == current_user.id
    ).order_by(Diagram.created_at.desc()).limit(5).all()
    
    return {
        "total_uploads": total_uploads,
        "completed_analyses": completed_analyses,
        "recent_projects": recent_projects
    }

@router.get("/history", response_model=List[DiagramListItem])
def get_analysis_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history = db.query(Diagram).filter(
        Diagram.user_id == current_user.id
    ).order_by(Diagram.created_at.desc()).all()
    return history


@router.get("/settings")
def get_settings(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "email": f"{current_user.username}@example.com",
        "notifications_enabled": True,
        "theme": "dark",
        "default_export_format": "pdf",
        "api_key_placeholder": "sk_diag_••••••••••••••••••••"
    }

@router.post("/settings")
def update_settings(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    return {
        "status": "success",
        "message": "Settings updated successfully",
        "updated_settings": payload
    }
