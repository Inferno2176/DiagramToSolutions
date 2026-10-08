from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database import get_db
from app.models import DiagramUpload, Project, AnalysisResult, User
from app.schemas import DashboardStats, DiagramListItem
from app.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id
    
    total_uploads = db.query(DiagramUpload).filter(DiagramUpload.user_id == user_id).count()
    completed_analyses = db.query(DiagramUpload).filter(
        DiagramUpload.user_id == user_id,
        DiagramUpload.processing_status.in_(["completed", "COMPLETED"])
    ).count()
    
    processing = db.query(DiagramUpload).filter(
        DiagramUpload.user_id == user_id,
        DiagramUpload.processing_status.in_(["ocr_processing", "ocr_completed", "llm_processing"])
    ).count()
    
    failed = db.query(DiagramUpload).filter(
        DiagramUpload.user_id == user_id,
        DiagramUpload.processing_status == "failed"
    ).count()
    
    total_analyses = db.query(AnalysisResult).join(DiagramUpload).filter(
        DiagramUpload.user_id == user_id
    ).count()
    
    recent_uploads = db.query(DiagramUpload).filter(
        DiagramUpload.user_id == user_id
    ).order_by(DiagramUpload.uploaded_at.desc()).limit(5).all()
    
    recent_projects = []
    for u in recent_uploads:
        recent_projects.append({
            "id": u.id,
            "filename": u.original_filename,
            "status": u.processing_status,
            "created_at": u.uploaded_at,
            "completed_at": u.analysis_result.completed_at if u.analysis_result else None,
            "project_id": u.project_id,
            "project_name": u.project.name if u.project else None,
            "architecture_name": u.analysis_result.architecture_name if u.analysis_result else None,
            "architecture_type": u.analysis_result.architecture_type if u.analysis_result else None
        })
    
    return {
        "total_uploads": total_uploads,
        "total_analyses": total_analyses,
        "completed_analyses": completed_analyses,
        "processing": processing,
        "failed": failed,
        "recent_projects": recent_projects
    }


@router.get("/history", response_model=List[DiagramListItem])
def get_analysis_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    uploads = db.query(DiagramUpload).filter(
        DiagramUpload.user_id == current_user.id
    ).order_by(DiagramUpload.uploaded_at.desc()).all()
    
    results = []
    for u in uploads:
        results.append({
            "id": u.id,
            "filename": u.original_filename,
            "status": u.processing_status,
            "created_at": u.uploaded_at,
            "completed_at": u.analysis_result.completed_at if u.analysis_result else None,
            "project_id": u.project_id,
            "project_name": u.project.name if u.project else None,
            "architecture_name": u.analysis_result.architecture_name if u.analysis_result else None,
            "architecture_type": u.analysis_result.architecture_type if u.analysis_result else None
        })
    return results


@router.get("/settings")
def get_settings(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "email": current_user.email or f"{current_user.username}@local.dev",
        "name": current_user.name or current_user.username,
        "notifications_enabled": True,
        "theme": "dark",
        "default_export_format": "pdf",
        "api_key_placeholder": "sk_diag_••••••••••••••••••••"
    }


@router.post("/settings")
def update_settings(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if "name" in payload and payload["name"]:
        current_user.name = str(payload["name"]).strip()
        db.commit()
        
    return {
        "status": "success",
        "message": "Settings updated successfully",
        "updated_settings": payload
    }
