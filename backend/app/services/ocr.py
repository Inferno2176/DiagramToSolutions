import os
import logging
import tempfile
import shutil
from typing import List, Dict, Any, Tuple
import cv2
import fitz  # PyMuPDF
from paddleocr import PaddleOCR

from app.services.image_processing import (
    validate_file_ingestion,
    validate_image_file,
    validate_pdf_file,
    normalize_diagram_image,
    SUPPORTED_IMAGE_EXTS,
    SUPPORTED_EXTS
)

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

def sort_detections_spatially(detections: List[Dict[str, Any]], y_threshold: int = 25) -> List[Dict[str, Any]]:
    """
    Sorts OCR detections into natural reading and architectural hierarchy order:
    Groups text by approximate vertical lines (rows) and sorts left-to-right.
    """
    if not detections:
        return detections

    def get_center_coords(item):
        bbox = item.get("bounding_box", [])
        if bbox and len(bbox) >= 4:
            cx = sum(p[0] for p in bbox) / len(bbox)
            cy = sum(p[1] for p in bbox) / len(bbox)
            return cx, cy
        return 0, 0

    sorted_items = sorted(detections, key=lambda d: get_center_coords(d)[1])

    lines = []
    current_line = []
    current_line_y = None

    for item in sorted_items:
        _, cy = get_center_coords(item)
        if current_line_y is None or abs(cy - current_line_y) <= y_threshold:
            current_line.append(item)
            if current_line_y is None:
                current_line_y = cy
            else:
                current_line_y = (current_line_y + cy) / 2.0
        else:
            current_line.sort(key=lambda d: get_center_coords(d)[0])
            lines.extend(current_line)
            current_line = [item]
            current_line_y = cy

    if current_line:
        current_line.sort(key=lambda d: get_center_coords(d)[0])
        lines.extend(current_line)

    return lines

def _process_ocr_result(ocr_result, min_confidence: float = 0.25) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Extracts structured detections from a PaddleOCR prediction result.
    Filters out detections below min_confidence.
    """
    detected_text_list = []
    plain_text_parts = []
    
    if not ocr_result:
        return detected_text_list, plain_text_parts

    rec_texts = ocr_result.get("rec_texts", [])
    rec_scores = ocr_result.get("rec_scores", [])
    rec_polys = ocr_result.get("rec_polys", [])
    rec_boxes = ocr_result.get("rec_boxes", [])
    
    for i in range(len(rec_texts)):
        text = str(rec_texts[i]).strip()
        confidence = float(rec_scores[i])
        
        if not text or confidence < min_confidence:
            continue
        
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

def extract_text_from_file(file_path: str, filename: str) -> Dict[str, Any]:
    """
    Extracts text from diagram files (PNG, JPG, JPEG, PDF) using PaddleOCR.
    Handles validation, normalization, page-by-page PDF conversion, and spatial ordering.
    """
    logger.info(f"File received: {filename}")

    # 1. Full validation guard
    is_valid, err_msg, detected_type = validate_file_ingestion(file_path, filename)
    if not is_valid:
        logger.error(f"File processing failed for {filename}: {err_msg}")
        raise ValueError(err_msg)

    logger.info(f"File validated: {filename}")
    ext = os.path.splitext(filename)[1].lower()
    logger.info(f"File type detected: {ext}")

    ocr_model = get_ocr_model()

    if ext == ".pdf":
        return _process_pdf_file(ocr_model, file_path, filename)
    elif ext in SUPPORTED_IMAGE_EXTS:
        return _process_image_file(ocr_model, file_path, filename)
    else:
        err = "Unsupported file format. Please upload PNG, JPG, JPEG, or PDF."
        logger.error(f"File processing failed for {filename}: {err}")
        raise ValueError(err)

def _process_image_file(ocr_model: PaddleOCR, file_path: str, filename: str) -> Dict[str, Any]:
    """
    Validates, normalizes, and runs OCR on an image file (PNG, JPG, JPEG).
    Preserves the original uploaded file without overwriting.
    """
    # Verify image readability
    is_valid, err_msg = validate_image_file(file_path)
    if not is_valid:
        logger.error(f"File processing failed for {filename}: {err_msg}")
        raise ValueError(err_msg)

    # Normalize image in-memory for PaddleOCR
    preprocessed_bgr = normalize_diagram_image(file_path)
    
    # Save normalized image to a temporary file (original file remains untouched)
    temp_img_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            temp_img_path = tmp.name
        cv2.imwrite(temp_img_path, preprocessed_bgr)
        
        logger.info(f"OCR processing started for {filename}")
        res = ocr_model.predict(temp_img_path)
        logger.info(f"OCR processing completed for {filename}")
    except Exception as e:
        logger.error(f"File processing failed for {filename}: OCR failure: {e}", exc_info=True)
        raise RuntimeError(f"OCR processing failed: {e}")
    finally:
        if temp_img_path and os.path.exists(temp_img_path):
            try:
                os.remove(temp_img_path)
            except Exception:
                pass
        
    if not res or len(res) == 0:
        err = "No text detected in the uploaded image."
        logger.error(f"File processing failed for {filename}: {err}")
        raise ValueError(err)
        
    raw_detections, _ = _process_ocr_result(res[0])
    if not raw_detections:
        err = "No text detected in the uploaded image."
        logger.error(f"File processing failed for {filename}: {err}")
        raise ValueError(err)

    # Sort detections spatially
    sorted_detections = sort_detections_spatially(raw_detections)
    plain_text = "\n".join([d["text"] for d in sorted_detections])

    # Structure page output
    pages_output = [
        {
            "page": 1,
            "text": plain_text,
            "detections": sorted_detections
        }
    ]

    return {
        "success": True,
        "filename": filename,
        "format": os.path.splitext(filename)[1].lower(),
        "total_pages": 1,
        "pages_processed": 1,
        "pages": pages_output,
        "total_detections": len(sorted_detections),
        "detected_text": sorted_detections,
        "plain_text": plain_text
    }

def _process_pdf_file(ocr_model: PaddleOCR, file_path: str, filename: str) -> Dict[str, Any]:
    """
    Converts multi-page PDF into images page-by-page and runs OCR independently per page.
    Combines results while preserving page numbers:
    {
      "page": 1,
      "text": "...",
      "detections": [...]
    }
    Does not silently ignore readable pages.
    Preserves original uploaded file.
    """
    logger.info(f"PDF conversion started: {filename}")

    # Validate PDF structure
    is_valid, err_msg, page_count = validate_pdf_file(file_path)
    if not is_valid:
        logger.error(f"File processing failed for {filename}: {err_msg}")
        raise ValueError(err_msg)

    logger.info(f"PDF pages detected: {page_count} pages in {filename}")

    temp_dir = tempfile.mkdtemp()
    pages_output = []
    all_detections = []
    all_page_texts = []

    try:
        doc = fitz.open(file_path)
        for page_num in range(page_count):
            current_page_idx = page_num + 1
            try:
                page = doc.load_page(page_num)
                # Render page at 200 DPI for sharp diagram text OCR
                pix = page.get_pixmap(dpi=200)
                raw_page_path = os.path.join(temp_dir, f"raw_page_{current_page_idx}.png")
                pix.save(raw_page_path)

                # Normalize rendered page
                prep_bgr = normalize_diagram_image(raw_page_path)
                prep_page_path = os.path.join(temp_dir, f"prep_page_{current_page_idx}.png")
                cv2.imwrite(prep_page_path, prep_bgr)

                # Execute OCR on this page independently
                logger.info(f"OCR processing started for {filename} (Page {current_page_idx})")
                res = ocr_model.predict(prep_page_path)
                logger.info(f"OCR processing completed for {filename} (Page {current_page_idx})")

                page_detections = []
                if res and len(res) > 0:
                    raw_page_detections, _ = _process_ocr_result(res[0])
                    sorted_page_detections = sort_detections_spatially(raw_page_detections)
                    page_detections = sorted_page_detections
                
                page_text = "\n".join([d["text"] for d in page_detections])

                # Append per-page structured output
                pages_output.append({
                    "page": current_page_idx,
                    "text": page_text,
                    "detections": page_detections
                })

                all_detections.extend(page_detections)
                if page_text:
                    if page_count > 1:
                        all_page_texts.append(f"--- Page {current_page_idx} ---\n{page_text}")
                    else:
                        all_page_texts.append(page_text)

            except Exception as page_err:
                logger.error(f"Error processing page {current_page_idx} of {filename}: {page_err}", exc_info=True)
                pages_output.append({
                    "page": current_page_idx,
                    "text": "",
                    "detections": [],
                    "error": str(page_err)
                })

        doc.close()

    except Exception as e:
        logger.error(f"File processing failed for {filename}: PDF conversion failure: {e}", exc_info=True)
        raise ValueError("PDF could not be processed.")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

    if not all_detections:
        err = "PDF could not be processed."
        logger.error(f"File processing failed for {filename}: {err}")
        raise ValueError(err)

    plain_text = "\n\n".join(all_page_texts)

    return {
        "success": True,
        "filename": filename,
        "format": ".pdf",
        "total_pages": page_count,
        "pages_processed": len(pages_output),
        "pages": pages_output,
        "total_detections": len(all_detections),
        "detected_text": all_detections,
        "plain_text": plain_text
    }
