import os
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models import Diagram, User
from app.auth import get_current_user
from app.services.ocr import extract_text_from_file
from app.services.llm import analyze_architecture_gemini, GeminiQuotaExceededError

logger = logging.getLogger("analyze_router")

router = APIRouter(prefix="/api/analyze", tags=["analyze"])

@router.post("/{upload_id}")
async def analyze_diagram(
    upload_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes the OCR and LLM pipeline for an uploaded diagram.
    """
    diagram = db.query(Diagram).filter(
        Diagram.id == upload_id,
        Diagram.user_id == current_user.id
    ).first()
    
    if not diagram:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded file not found or access denied"
        )
        
    # 7. Check whether a completed architecture analysis already exists
    if diagram.status and diagram.status.upper() == "COMPLETED" and diagram.analysis_json:
        logger.info(f"Analysis already completed for {upload_id}. Returning stored analysis.")
        return {
            "upload_id": diagram.id,
            "status": diagram.status,
            "analysis": diagram.analysis_json
        }
        
    if not os.path.exists(diagram.file_path):
        diagram.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded file is missing from storage"
        )
        
    ocr_text = diagram.ocr_text
    ocr_json = diagram.ocr_json
    
    # 6. Check if OCR data already exists
    if ocr_text and str(ocr_text).strip():
        logger.info(f"OCR data already exists for {upload_id}. Skipping OCR step.")
    else:
        # 1. Update status to ocr_processing
        diagram.status = "ocr_processing"
        db.commit()
        
        try:
            # 2. Extract OCR non-blockingly
            from fastapi.concurrency import run_in_threadpool
            ocr_result = await run_in_threadpool(extract_text_from_file, diagram.file_path, diagram.filename)
            
            if not ocr_result:
                raise ValueError("OCR result missing")
                
            ocr_text = ocr_result.get("plain_text")
            ocr_json = ocr_result.get("detected_text")
            
            if not ocr_text or not str(ocr_text).strip():
                raise ValueError("OCR extracted text empty")
                
            diagram.ocr_text = ocr_text
            diagram.ocr_json = ocr_json
            
            logger.info(f"OCR completed for {upload_id}")
            
            # Update status to ocr_completed
            diagram.status = "ocr_completed"
            db.commit()
            
        except Exception as e:
            diagram.status = "failed"
            db.commit()
            logger.error(f"OCR failed for {upload_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"OCR processing failure: {str(e)}"
            )
            
    # 3. Update status to llm_processing
    diagram.status = "llm_processing"
    db.commit()
    
    logger.info(f"Gemini analysis started for {upload_id}")
    
    try:
        # 4. Generate Analysis using Gemini
        analysis = await analyze_architecture_gemini(ocr_text, ocr_json)
        
        diagram.architecture_summary = analysis.get("summary", {}).get("overview")
        diagram.analysis_json = analysis
        
        # We need to store everything. The DB models accept these JSONs.
        diagram.tech_stack = analysis.get("tech_stack")
        diagram.components = analysis.get("components")
        diagram.suggested_apis = analysis.get("suggested_apis")
        
        # Handle workflow safely
        workflows = analysis.get("workflow", [])
        workflow_text = "\n".join([f"Step {w.get('step', i+1)} - {w.get('title', '')}: {w.get('description', '')}" for i, w in enumerate(workflows)])
        diagram.workflow_explanation = workflow_text
        
        # Handle Database Entities
        db_schema = analysis.get("database_schema", {})
        if db_schema.get("required") and "entities" in db_schema:
            diagram.database_entities = db_schema.get("entities")
        else:
            diagram.database_entities = []
            
        diagram.status = "completed"
        diagram.completed_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Gemini analysis completed for {upload_id}")
        
    except GeminiQuotaExceededError as e:
        diagram.status = "llm_quota_exceeded"
        db.commit()
        logger.error(f"Gemini quota limit reached for {upload_id}: {e}")
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "upload_id": diagram.id,
                "status": "llm_quota_exceeded",
                "error": {
                    "type": "LLM_QUOTA_EXCEEDED",
                    "message": "Gemini API quota is currently exhausted. OCR processing has completed successfully and the extracted data has been preserved.",
                    "retryable": true
                }
            }
        )
    except Exception as e:
        diagram.status = "failed"
        db.commit()
        logger.error(f"Analysis failed for {upload_id}: {e}")
        # Return a meaningful analysis error while preserving OCR data
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini API or Analysis processing failure: {str(e)}. OCR data has been preserved."
        )
        
    # Return formatted final response
    return {
        "upload_id": diagram.id,
        "status": diagram.status,
        "analysis": analysis
    }
