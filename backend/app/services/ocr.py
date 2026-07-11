import os
import logging
import tempfile
import shutil
from typing import List, Dict, Any
import fitz  # PyMuPDF
from paddleocr import PaddleOCR

logger = logging.getLogger("ocr_service")

# Global model instance
_ocr_model: PaddleOCR = None

def initialize_ocr():
    """
    Initializes the PaddleOCR model. Call this during application startup.
    """
    global _ocr_model
    if _ocr_model is None:
        try:
            logger.info("Initializing PaddleOCR model...")
            # Disable MKLDNN/oneDNN to bypass Paddle v3 compatibility bugs on CPU
            os.environ["FLAGS_use_mkldnn"] = "0"
            os.environ["FLAGS_enable_onednn"] = "0"
            # We initialize PaddleOCR with English language and CPU by default for safety across machines.
            _ocr_model = PaddleOCR(use_angle_cls=True, lang="en", device="cpu", enable_mkldnn=False)
            logger.info("PaddleOCR model initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR: {e}", exc_info=True)
            raise RuntimeError(f"OCR model initialization failed: {e}")

def get_ocr_model() -> PaddleOCR:
    """
    Get the initialized PaddleOCR model instance.
    """
    global _ocr_model
    if _ocr_model is None:
        raise RuntimeError("PaddleOCR model has not been initialized. Call initialize_ocr() first.")
    return _ocr_model

def extract_text_from_file(file_path: str, filename: str) -> Dict[str, Any]:
    """
    Extracts text from the given file (image or PDF) using PaddleOCR.
    """
    ocr_model = get_ocr_model()
    
    ext = os.path.splitext(filename)[1].lower()
    supported_image_exts = [".png", ".jpg", ".jpeg"]
    
    if ext == ".pdf":
        return _process_pdf_file(ocr_model, file_path, filename)
    elif ext in supported_image_exts:
        return _process_image_file(ocr_model, file_path, filename)
    else:
        raise ValueError(f"Unsupported file format: {ext}")

def _process_ocr_result(ocr_result) -> tuple[List[Dict[str, Any]], List[str]]:
    """
    Helper to extract details from an OCRResult object.
    """
    detected_text_list = []
    plain_text_parts = []
    
    rec_texts = ocr_result.get("rec_texts", [])
    rec_scores = ocr_result.get("rec_scores", [])
    rec_polys = ocr_result.get("rec_polys", [])
    rec_boxes = ocr_result.get("rec_boxes", [])
    
    for i in range(len(rec_texts)):
        text = rec_texts[i]
        confidence = float(rec_scores[i])
        
        # Determine bounding box
        int_box = []
        if i < len(rec_polys) and rec_polys[i] is not None:
            poly = rec_polys[i]
            poly_list = poly.tolist() if hasattr(poly, "tolist") else poly
            int_box = [[int(pt[0]), int(pt[1])] for pt in poly_list]
        elif i < len(rec_boxes) and rec_boxes[i] is not None:
            box = rec_boxes[i]
            box_list = box.tolist() if hasattr(box, "tolist") else box
            xmin, ymin, xmax, ymax = box_list
            int_box = [
                [int(xmin), int(ymin)],
                [int(xmax), int(ymin)],
                [int(xmax), int(ymax)],
                [int(xmin), int(ymax)]
            ]
            
        detected_text_list.append({
            "text": text,
            "confidence": round(confidence, 4),
            "bounding_box": int_box
        })
        plain_text_parts.append(text)
        
    return detected_text_list, plain_text_parts

def _process_image_file(ocr_model: PaddleOCR, file_path: str, filename: str) -> Dict[str, Any]:
    """
    Processes a single image file with PaddleOCR.
    """
    try:
        res = ocr_model.predict(file_path)
    except Exception as e:
        logger.error(f"PaddleOCR processing error for image {filename}: {e}", exc_info=True)
        raise RuntimeError(f"OCR processing failed: {e}")
        
    if not res or len(res) == 0:
        raise ValueError("No text detected in the uploaded image.")
        
    detected_text_list, plain_text_parts = _process_ocr_result(res[0])
            
    if not detected_text_list:
        raise ValueError("No text detected in the uploaded image.")
        
    return {
        "success": True,
        "filename": filename,
        "total_detections": len(detected_text_list),
        "detected_text": detected_text_list,
        "plain_text": "\n".join(plain_text_parts)
    }

def _process_pdf_file(ocr_model: PaddleOCR, file_path: str, filename: str) -> Dict[str, Any]:
    """
    Converts PDF pages to images, processes them, and aggregates results.
    """
    temp_dir = tempfile.mkdtemp()
    detected_text_list = []
    plain_text_parts = []
    
    try:
        doc = fitz.open(file_path)
        if len(doc) == 0:
            raise ValueError("The uploaded PDF file contains no pages.")
            
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=150)
            page_img_path = os.path.join(temp_dir, f"page_{page_num}.png")
            pix.save(page_img_path)
            
            # Run OCR on this page image
            try:
                res = ocr_model.predict(page_img_path)
            except Exception as ocr_err:
                logger.error(f"PaddleOCR processing error for page {page_num} of {filename}: {ocr_err}")
                continue  # Try to process other pages
                
            if res and len(res) > 0:
                page_detections, page_texts = _process_ocr_result(res[0])
                detected_text_list.extend(page_detections)
                plain_text_parts.extend(page_texts)
                    
    except Exception as e:
        logger.error(f"PDF OCR processing failed for {filename}: {e}", exc_info=True)
        if isinstance(e, ValueError):
            raise e
        raise RuntimeError(f"PDF OCR processing failed: {e}")
    finally:
        # Clean up temp folder and images
        shutil.rmtree(temp_dir, ignore_errors=True)
        
    if not detected_text_list:
        raise ValueError("No text detected in the uploaded PDF document.")
        
    return {
        "success": True,
        "filename": filename,
        "total_detections": len(detected_text_list),
        "detected_text": detected_text_list,
        "plain_text": "\n".join(plain_text_parts)
    }
