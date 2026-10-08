import os
import json
import shutil
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import Response, FileResponse
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models import Diagram, DiagramUpload, Project, OcrResult, AnalysisResult, User
from app.schemas import DiagramDetailResponse, DiagramListItem
from app.auth import get_current_user
from app.config import UPLOAD_DIR
from app.services.image_processing import validate_file_ingestion, MAX_FILE_SIZE, SUPPORTED_EXTS

# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

logger = logging.getLogger("diagrams_router")
router = APIRouter(prefix="/api/diagrams", tags=["diagrams"])

@router.post("/upload", response_model=DiagramListItem, status_code=status.HTTP_201_CREATED)
def upload_diagram(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"File received: {file.filename} from user {current_user.username}")
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in SUPPORTED_EXTS:
        err = "Unsupported file format. Please upload PNG, JPG, JPEG, or PDF."
        logger.error(f"File processing failed for {file.filename}: {err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err
        )
    
    diagram_id = str(uuid.uuid4())
    unique_filename = f"{diagram_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Stream and track file size to enforce limit safely
    total_size = 0
    chunk_size = 1024 * 1024  # 1 MB chunks
    try:
        with open(file_path, "wb") as buffer:
            while True:
                chunk = file.file.read(chunk_size)
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > MAX_FILE_SIZE:
                    err = "File exceeds the maximum allowed size."
                    logger.error(f"File processing failed for {file.filename}: {err}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=err
                    )
                buffer.write(chunk)
    except HTTPException:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        logger.error(f"File processing failed for {file.filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded file: {str(e)}"
        )

    # Validate file format and corruption
    is_valid, err_msg, _ = validate_file_ingestion(
        file_path=file_path,
        filename=file.filename,
        content_type=file.content_type
    )
    if not is_valid:
        if os.path.exists(file_path):
            os.remove(file_path)
        logger.error(f"File processing failed for {file.filename}: {err_msg}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )
    
    # Ensure Project association
    target_project = None
    if project_id:
        target_project = db.query(Project).filter(
            Project.id == project_id,
            Project.user_id == current_user.id
        ).first()
        
    if not target_project:
        # Create or find default project for this file
        proj_name = os.path.splitext(file.filename)[0].replace("_", " ").title()
        target_project = Project(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            name=proj_name,
            description=f"Project for blueprint {file.filename}",
            status="active"
        )
        db.add(target_project)
        db.flush()

    mime_type = file.content_type or ("application/pdf" if file_ext == ".pdf" else f"image/{file_ext.lstrip('.')}")

    # 1. Create DiagramUpload entity (New Normalized Data Model)
    new_upload = DiagramUpload(
        id=diagram_id,
        project_id=target_project.id,
        user_id=current_user.id,
        original_filename=file.filename,
        stored_filename=unique_filename,
        file_type=file_ext,
        mime_type=mime_type,
        file_size=total_size,
        storage_path=file_path,
        processing_status="uploaded"
    )
    db.add(new_upload)

    # 2. Dual-write to legacy Diagram model for backward compatibility
    legacy_diagram = Diagram(
        id=diagram_id,
        user_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        status="uploaded"
    )
    db.add(legacy_diagram)

    db.commit()
    db.refresh(new_upload)

    return {
        "id": new_upload.id,
        "filename": new_upload.original_filename,
        "status": new_upload.processing_status,
        "created_at": new_upload.uploaded_at,
        "completed_at": None,
        "project_id": target_project.id,
        "project_name": target_project.name
    }


@router.get("", response_model=List[DiagramListItem])
def list_diagrams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    uploads = db.query(DiagramUpload).filter(
        DiagramUpload.user_id == current_user.id
    ).order_by(DiagramUpload.uploaded_at.desc()).all()
    
    results = []
    for u in uploads:
        project_name = u.project.name if u.project else None
        completed_at = u.analysis_result.completed_at if u.analysis_result else None
        arch_name = u.analysis_result.architecture_name if u.analysis_result else None
        arch_type = u.analysis_result.architecture_type if u.analysis_result else None
        
        results.append({
            "id": u.id,
            "filename": u.original_filename,
            "status": u.processing_status,
            "created_at": u.uploaded_at,
            "completed_at": completed_at,
            "project_id": u.project_id,
            "project_name": project_name,
            "architecture_name": arch_name,
            "architecture_type": arch_type
        })
    return results


@router.get("/{diagram_id}", response_model=DiagramDetailResponse)
def get_diagram_details(
    diagram_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify ownership in DiagramUpload first
    upload = db.query(DiagramUpload).filter(
        DiagramUpload.id == diagram_id,
        DiagramUpload.user_id == current_user.id
    ).first()
    
    if not upload:
        # Fallback check on legacy Diagram table
        diagram = db.query(Diagram).filter(
            Diagram.id == diagram_id,
            Diagram.user_id == current_user.id
        ).first()
        if not diagram:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Diagram not found or access denied"
            )
        return diagram

    # Retrieve associated OCR and AI Analysis results
    ocr = upload.ocr_result
    analysis = upload.analysis_result
    
    return {
        "id": upload.id,
        "filename": upload.original_filename,
        "status": upload.processing_status,
        "ocr_text": ocr.ocr_text if ocr else None,
        "ocr_json": ocr.ocr_json if ocr else None,
        "analysis_json": analysis.raw_analysis_json if analysis else None,
        "architecture_summary": analysis.summary if analysis else None,
        "workflow_explanation": analysis.workflow_explanation if analysis else None,
        "tech_stack": analysis.tech_stack if analysis else None,
        "components": analysis.components if analysis else None,
        "suggested_apis": analysis.suggested_apis if analysis else None,
        "database_entities": analysis.database_schema if analysis else None,
        "created_at": upload.uploaded_at,
        "completed_at": analysis.completed_at if analysis else None,
        "project_id": upload.project_id,
        "project_name": upload.project.name if upload.project else None,
        "architecture_name": analysis.architecture_name if analysis else None,
        "architecture_type": analysis.architecture_type if analysis else None
    }


@router.get("/{diagram_id}/download/{export_format}")
def download_diagram_report(
    diagram_id: str,
    export_format: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    upload = db.query(DiagramUpload).filter(
        DiagramUpload.id == diagram_id,
        DiagramUpload.user_id == current_user.id
    ).first()
    
    if not upload:
        diagram = db.query(Diagram).filter(
            Diagram.id == diagram_id,
            Diagram.user_id == current_user.id
        ).first()
        if not diagram:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Diagram not found or access denied"
            )
        upload_status = diagram.status
        filename = diagram.filename
        created_at = diagram.created_at
        completed_at = diagram.completed_at
        summary = diagram.architecture_summary
        workflow = diagram.workflow_explanation
        tech_stack = diagram.tech_stack
        components = diagram.components
        suggested_apis = diagram.suggested_apis
        db_entities = diagram.database_entities
    else:
        upload_status = upload.processing_status
        filename = upload.original_filename
        created_at = upload.uploaded_at
        analysis = upload.analysis_result
        completed_at = analysis.completed_at if analysis else None
        summary = analysis.summary if analysis else None
        workflow = analysis.workflow_explanation if analysis else None
        tech_stack = analysis.tech_stack if analysis else None
        components = analysis.components if analysis else None
        suggested_apis = analysis.suggested_apis if analysis else None
        db_entities = analysis.database_schema if analysis else None

    if upload_status.upper() != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Analysis is not completed yet"
        )
        
    export_format = export_format.lower()
    
    if export_format == "json":
        report_data = {
            "diagram_id": diagram_id,
            "filename": filename,
            "created_at": created_at.isoformat() if created_at else None,
            "completed_at": completed_at.isoformat() if completed_at else None,
            "architecture_summary": summary,
            "workflow_explanation": workflow,
            "tech_stack": tech_stack,
            "components": components,
            "suggested_apis": suggested_apis,
            "database_entities": db_entities
        }
        json_content = json.dumps(report_data, indent=2)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={os.path.splitext(filename)[0]}_report.json"}
        )
        
    elif export_format == "markdown":
        md_content = f"# Engineering Report: {os.path.splitext(filename)[0]}\n\n"
        md_content += f"**Original Diagram:** {filename}\n"
        md_content += f"**Generated At:** {completed_at.strftime('%Y-%m-%d %H:%M:%S') if completed_at else 'N/A'}\n\n"
        
        md_content += "## 1. Architecture Summary\n"
        md_content += f"{summary or 'N/A'}\n\n"
        
        md_content += "## 2. Workflow Explanation\n"
        md_content += f"{workflow or 'N/A'}\n\n"
        
        md_content += "## 3. Technology Stack\n"
        if tech_stack and isinstance(tech_stack, dict):
            for layer, items in tech_stack.items():
                if isinstance(items, list):
                    md_content += f"- **{layer.capitalize()}:** {', '.join(items)}\n"
        elif tech_stack and isinstance(tech_stack, list):
            for t in tech_stack:
                if isinstance(t, dict):
                    md_content += f"- **{t.get('layer', 'Technology')}:** {t.get('technology', '')}\n"
        md_content += "\n"
        
        md_content += "## 4. Components\n"
        if components and isinstance(components, list):
            for comp in components:
                if isinstance(comp, dict):
                    md_content += f"### {comp.get('name', 'Component')}\n"
                    md_content += f"- **Description:** {comp.get('description', '')}\n"
                    if comp.get('tech'):
                        md_content += f"- **Tech:** {comp.get('tech')}\n"
                    md_content += "\n"
                    
        return Response(
            content=md_content,
            media_type="text/markdown",
            headers={"Content-Disposition": f"attachment; filename={os.path.splitext(filename)[0]}_report.md"}
        )
        
    elif export_format == "pdf":
        temp_pdf_path = os.path.join(UPLOAD_DIR, f"temp_{diagram_id}.pdf")
        try:
            doc = SimpleDocTemplate(
                temp_pdf_path,
                pagesize=letter,
                rightMargin=40, leftMargin=40,
                topMargin=40, bottomMargin=40
            )
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'DocTitle',
                parent=styles['Heading1'],
                fontSize=22,
                leading=26,
                textColor=colors.HexColor('#0F766E'),
                spaceAfter=15
            )
            h2_style = ParagraphStyle(
                'DocH2',
                parent=styles['Heading2'],
                fontSize=14,
                leading=18,
                textColor=colors.HexColor('#1E293B'),
                spaceBefore=14,
                spaceAfter=8
            )
            body_style = ParagraphStyle(
                'DocBody',
                parent=styles['Normal'],
                fontSize=10,
                leading=14,
                textColor=colors.HexColor('#334155'),
                spaceAfter=8
            )
            story = []
            story.append(Paragraph(f"Architecture Solution: {filename}", title_style))
            story.append(Spacer(1, 10))
            
            story.append(Paragraph("1. Architecture Summary", h2_style))
            story.append(Paragraph(summary or "No summary provided.", body_style))
            story.append(Spacer(1, 8))
            
            story.append(Paragraph("2. Workflow Explanation", h2_style))
            story.append(Paragraph(workflow or "No workflow description available.", body_style))
            story.append(Spacer(1, 8))
            
            doc.build(story)
            return FileResponse(
                path=temp_pdf_path,
                filename=f"{os.path.splitext(filename)[0]}_report.pdf",
                media_type="application/pdf"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate PDF: {str(e)}"
            )
            
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{export_format}'. Use pdf, markdown, or json."
        )


@router.delete("/{diagram_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_diagram(
    diagram_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    upload = db.query(DiagramUpload).filter(
        DiagramUpload.id == diagram_id,
        DiagramUpload.user_id == current_user.id
    ).first()
    
    legacy_diagram = db.query(Diagram).filter(
        Diagram.id == diagram_id,
        Diagram.user_id == current_user.id
    ).first()
    
    if not upload and not legacy_diagram:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagram not found or access denied"
        )
        
    if upload:
        if upload.storage_path and os.path.exists(upload.storage_path):
            try:
                os.remove(upload.storage_path)
            except Exception:
                pass
        db.delete(upload)
        
    if legacy_diagram:
        db.delete(legacy_diagram)
        
    db.commit()
    return None
