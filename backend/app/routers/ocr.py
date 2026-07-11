import os
import uuid
import shutil
import logging
from fastapi import APIRouter, File, UploadFile, HTTPException, status

from app.config import UPLOAD_DIR
from app.services.ocr import extract_text_from_file

logger = logging.getLogger("ocr_router")

router = APIRouter(tags=["ocr"])

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".pdf"}

@router.post("/ocr")
def run_ocr(file: UploadFile = File(...)):
    """
    Accepts an upload of an image (PNG, JPG, JPEG) or PDF,
    performs OCR using PaddleOCR, and returns the structured extraction result.
    """
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    
    # 1. Validate supported file format
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Supported formats: {', '.join(SUPPORTED_EXTENSIONS)}"
        )
        
    # Create a unique temporary file path in the upload directory
    temp_filename = f"ocr_temp_{uuid.uuid4()}{ext}"
    temp_file_path = os.path.join(UPLOAD_DIR, temp_filename)
    
    try:
        # 2. Save uploaded file temporarily
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 3. Call the OCR service
        ocr_result = extract_text_from_file(temp_file_path, filename)
        return ocr_result
        
    except ValueError as val_err:
        # Typically raise for empty OCR results or bad/unsupported files
        logger.warning(f"Validation error during OCR processing for {filename}: {val_err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except RuntimeError as run_err:
        # Typically OCR model initialization failures or internal failures
        logger.error(f"Runtime error during OCR processing for {filename}: {run_err}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(run_err)
        )
    except Exception as e:
        logger.error(f"Unexpected error processing OCR for {filename}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during OCR processing: {str(e)}"
        )
    finally:
        # 4. Clean up temporary uploaded file
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as cleanup_err:
                logger.error(f"Failed to clean up temporary file {temp_file_path}: {cleanup_err}")
