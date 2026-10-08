import os
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from fastapi.concurrency import run_in_threadpool

from app.database import get_db
from app.models import Diagram, DiagramUpload, OcrResult, AnalysisResult, User
from app.auth import get_current_user
from app.services.ocr import extract_text_from_file
from app.services.llm import analyze_architecture_gemini, GeminiQuotaExceededError

logger = logging.getLogger("analyze_router")
router = APIRouter(prefix="/api/analyze", tags=["analyze"])

@router.get("/{upload_id}")
def get_diagram_analysis(
    upload_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves previously stored OCR & Gemini analysis result for an uploaded diagram.
    Never re-triggers Gemini.
    """
    upload = db.query(DiagramUpload).filter(
        DiagramUpload.id == upload_id,
        DiagramUpload.user_id == current_user.id
    ).first()
    
    analysis_record = upload.analysis_result if upload else None
    ocr_record = upload.ocr_result if upload else None
    
    if not upload:
        # Fallback to legacy Diagram
        diagram = db.query(Diagram).filter(
            Diagram.id == upload_id,
            Diagram.user_id == current_user.id
        ).first()
        if not diagram:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found or access denied"
            )
        return {
            "upload_id": diagram.id,
            "status": diagram.status,
            "analysis": diagram.analysis_json,
            "architecture_summary": diagram.architecture_summary,
            "workflow_explanation": diagram.workflow_explanation,
            "tech_stack": diagram.tech_stack,
            "components": diagram.components,
            "suggested_apis": diagram.suggested_apis,
            "database_entities": diagram.database_entities
        }
        
    return {
        "upload_id": upload.id,
        "status": upload.processing_status,
        "analysis": analysis_record.raw_analysis_json if analysis_record else None,
        "architecture_summary": analysis_record.summary if analysis_record else None,
        "workflow_explanation": analysis_record.workflow_explanation if analysis_record else None,
        "tech_stack": analysis_record.tech_stack if analysis_record else None,
        "components": analysis_record.components if analysis_record else None,
        "suggested_apis": analysis_record.suggested_apis if analysis_record else None,
        "database_entities": analysis_record.database_schema if analysis_record else None,
        "ocr_text": ocr_record.ocr_text if ocr_record else None
    }


@router.post("/{upload_id}")
async def analyze_diagram(
    upload_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes the OCR and LLM pipeline for an uploaded diagram belonging to current_user.
    Stores input, OCR output, and generated solution systematically.
    """
    upload = db.query(DiagramUpload).filter(
        DiagramUpload.id == upload_id,
        DiagramUpload.user_id == current_user.id
    ).first()
    
    legacy_diagram = db.query(Diagram).filter(
        Diagram.id == upload_id,
        Diagram.user_id == current_user.id
    ).first()
    
    if not upload and not legacy_diagram:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded file not found or access denied"
        )
        
    file_path = upload.storage_path if upload else legacy_diagram.file_path
    filename = upload.original_filename if upload else legacy_diagram.filename
    current_status = upload.processing_status if upload else legacy_diagram.status
    
    # 1. Check whether a completed architecture analysis already exists (Recovery without re-running Gemini)
    if upload and upload.analysis_result and upload.analysis_result.raw_analysis_json:
        logger.info(f"Analysis already completed for {upload_id}. Returning stored analysis.")
        return {
            "upload_id": upload.id,
            "status": upload.processing_status,
            "analysis": upload.analysis_result.raw_analysis_json
        }
    elif legacy_diagram and legacy_diagram.status and legacy_diagram.status.upper() == "COMPLETED" and legacy_diagram.analysis_json:
        logger.info(f"Legacy analysis already completed for {upload_id}. Returning stored analysis.")
        return {
            "upload_id": legacy_diagram.id,
            "status": legacy_diagram.status,
            "analysis": legacy_diagram.analysis_json
        }
        
    if not os.path.exists(file_path):
        if upload:
            upload.processing_status = "failed"
        if legacy_diagram:
            legacy_diagram.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded blueprint file is missing from storage"
        )
        
    # Check existing OCR
    ocr_record = upload.ocr_result if upload else None
    ocr_text = ocr_record.ocr_text if ocr_record else (legacy_diagram.ocr_text if legacy_diagram else None)
    ocr_json = ocr_record.ocr_json if ocr_record else (legacy_diagram.ocr_json if legacy_diagram else None)
    
    if ocr_text and str(ocr_text).strip():
        logger.info(f"OCR data already exists for {upload_id}. Skipping OCR step.")
    else:
        # Update status to ocr_processing
        if upload:
            upload.processing_status = "ocr_processing"
        if legacy_diagram:
            legacy_diagram.status = "ocr_processing"
        db.commit()
        
        try:
            ocr_result = await run_in_threadpool(extract_text_from_file, file_path, filename)
            if not ocr_result:
                raise ValueError("OCR text extraction returned empty payload")
                
            ocr_text = ocr_result.get("plain_text")
            ocr_json = {
                "detected_text": ocr_result.get("detected_text", []),
                "pages": ocr_result.get("pages", []),
                "total_detections": ocr_result.get("total_detections", 0),
                "pages_processed": ocr_result.get("pages_processed", 1)
            }
            
            if not ocr_text or not str(ocr_text).strip():
                raise ValueError("No legible text detected on diagram")
                
            # Store OCR result in normalized OcrResult entity
            if upload:
                if not ocr_record:
                    ocr_record = OcrResult(
                        id=str(uuid.uuid4()),
                        diagram_upload_id=upload.id,
                        ocr_text=ocr_text,
                        ocr_json=ocr_json,
                        confidence=0.95,
                        total_detections=ocr_json.get("total_detections", 0),
                        pages_processed=ocr_json.get("pages_processed", 1),
                        status="completed"
                    )
                    db.add(ocr_record)
                else:
                    ocr_record.ocr_text = ocr_text
                    ocr_record.ocr_json = ocr_json
                    ocr_record.status = "completed"
                upload.processing_status = "ocr_completed"
                
            if legacy_diagram:
                legacy_diagram.ocr_text = ocr_text
                legacy_diagram.ocr_json = ocr_json
                legacy_diagram.status = "ocr_completed"
                
            db.commit()
            logger.info(f"OCR completed and saved for {upload_id}")
            
        except Exception as e:
            if upload:
                upload.processing_status = "failed"
            if legacy_diagram:
                legacy_diagram.status = "failed"
            db.commit()
            logger.error(f"OCR processing failure for {upload_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Diagram text extraction error: {str(e)}"
            )

    # Update status to llm_processing
    if upload:
        upload.processing_status = "llm_processing"
    if legacy_diagram:
        legacy_diagram.status = "llm_processing"
    db.commit()
    
    logger.info(f"Gemini architecture analysis started for {upload_id}")
    
    try:
        analysis = await analyze_architecture_gemini(
            ocr_text=ocr_text,
            ocr_json=ocr_json,
            diagram_file_path=file_path
        )
        
        now = datetime.now(timezone.utc)
        arch_summary = analysis.get("summary", {}).get("overview")
        arch_name = analysis.get("summary", {}).get("architecture_name") or filename
        arch_type = analysis.get("summary", {}).get("architecture_type")
        
        workflows = analysis.get("workflow", [])
        workflow_text = "\n".join([f"Step {w.get('step', i+1)} - {w.get('title', '')}: {w.get('description', '')}" for i, w in enumerate(workflows)]) if isinstance(workflows, list) else str(workflows)
        
        db_schema = analysis.get("database_schema", {})
        if isinstance(db_schema, dict) and db_schema.get("required") and "entities" in db_schema:
            db_entities = db_schema.get("entities")
        else:
            db_entities = []

        # Store in normalized AnalysisResult entity
        if upload:
            analysis_record = upload.analysis_result
            if not analysis_record:
                analysis_record = AnalysisResult(
                    id=str(uuid.uuid4()),
                    diagram_upload_id=upload.id,
                    architecture_name=arch_name,
                    architecture_type=arch_type,
                    summary=arch_summary,
                    workflow=workflows if isinstance(workflows, list) else None,
                    workflow_explanation=workflow_text,
                    tech_stack=analysis.get("tech_stack"),
                    components=analysis.get("components"),
                    suggested_apis=analysis.get("suggested_apis"),
                    database_schema=db_entities,
                    architecture_relationships=analysis.get("architecture_relationships"),
                    diagram_analysis=analysis.get("diagram_analysis"),
                    raw_analysis_json=analysis,
                    model_name="gemini",
                    analysis_status="completed",
                    completed_at=now
                )
                db.add(analysis_record)
            else:
                analysis_record.architecture_name = arch_name
                analysis_record.architecture_type = arch_type
                analysis_record.summary = arch_summary
                analysis_record.workflow = workflows if isinstance(workflows, list) else None
                analysis_record.workflow_explanation = workflow_text
                analysis_record.tech_stack = analysis.get("tech_stack")
                analysis_record.components = analysis.get("components")
                analysis_record.suggested_apis = analysis.get("suggested_apis")
                analysis_record.database_schema = db_entities
                analysis_record.raw_analysis_json = analysis
                analysis_record.analysis_status = "completed"
                analysis_record.completed_at = now
                
            upload.processing_status = "completed"
            
        if legacy_diagram:
            legacy_diagram.architecture_summary = arch_summary
            legacy_diagram.analysis_json = analysis
            legacy_diagram.tech_stack = analysis.get("tech_stack")
            legacy_diagram.components = analysis.get("components")
            legacy_diagram.suggested_apis = analysis.get("suggested_apis")
            legacy_diagram.workflow_explanation = workflow_text
            legacy_diagram.database_entities = db_entities
            legacy_diagram.status = "completed"
            legacy_diagram.completed_at = now
            
        db.commit()
        logger.info(f"Gemini analysis completed and saved for {upload_id}")
        
    except GeminiQuotaExceededError as e:
        if upload:
            upload.processing_status = "llm_quota_exceeded"
        if legacy_diagram:
            legacy_diagram.status = "llm_quota_exceeded"
        db.commit()
        logger.error(f"Gemini quota limit reached for {upload_id}: {e}")
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "upload_id": upload_id,
                "status": "llm_quota_exceeded",
                "error": {
                    "type": "LLM_QUOTA_EXCEEDED",
                    "message": "Gemini API quota is currently exhausted. OCR data has been preserved.",
                    "retryable": True
                }
            }
        )
    except Exception as e:
        if upload:
            upload.processing_status = "failed"
        if legacy_diagram:
            legacy_diagram.status = "failed"
        db.commit()
        logger.error(f"Analysis failed for {upload_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini API or Analysis processing failure: {str(e)}. OCR data has been preserved."
        )
        
    return {
        "upload_id": upload_id,
        "status": "completed",
        "analysis": analysis
    }
