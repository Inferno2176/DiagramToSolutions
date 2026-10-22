import os
import json
import logging
import tempfile
from typing import Dict, Any, List, Optional, Tuple
import cv2
import numpy as np

from app.config import GEMINI_API_KEY, BACKEND_DIR
from app.services.image_processing import (
    normalize_diagram_image,
    preprocess_handwritten_diagram,
    detect_handwriting_features,
    validate_image_file,
    SUPPORTED_IMAGE_EXTS
)

logger = logging.getLogger("handwritten_ocr")

# Robust list of multimodal models in preferred order
VISION_MODEL_FALLBACKS = [
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest"
]

HANDWRITTEN_OCR_PROMPT = """
You are an expert Optical Character Recognition (OCR) and Computer Vision engine specialized in recognizing handwritten notes, whiteboard diagrams, and hand-drawn software architecture sketches.

Carefully inspect the provided diagram image and extract ALL handwritten and hand-drawn text labels, components, connectors, and annotations.

Return ONLY a valid JSON object strictly matching this schema:
{
  "diagram_type": "handwritten_sketch",
  "plain_text": "Complete transcribed text in natural architectural reading order (top-to-bottom, left-to-right)",
  "detections": [
    {
      "text": "Exact transcribed text label",
      "confidence": 0.95,
      "element_type": "component_box" or "arrow_label" or "title" or "annotation" or "database_cylinder",
      "bounding_box": [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]
    }
  ],
  "relationships": [
    {
      "source": "Name of source component",
      "target": "Name of target component",
      "label": "Protocol, action or label on the arrow/connector if present"
    }
  ],
  "handwriting_quality": "clear" or "legible" or "faint" or "messy"
}
"""

def extract_handwritten_with_vision(image_bytes: bytes, mime_type: str = "image/png") -> Dict[str, Any]:
    """
    Extracts text and components from a handwritten or whiteboard diagram using Gemini Multimodal Vision.
    Iterates through fallback models to handle temporary 503 load spikes gracefully.
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured for multimodal handwritten extraction.")

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)
    last_err = None

    for model_name in VISION_MODEL_FALLBACKS:
        try:
            logger.info(f"Attempting handwritten vision extraction with model: {model_name}")
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    HANDWRITTEN_OCR_PROMPT
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )

            if not response or not response.text or not response.text.strip():
                raise ValueError(f"Empty response from model {model_name}")

            raw_text = response.text.strip()
            # Clean markdown formatting if present
            if raw_text.startswith("```"):
                lines = raw_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                raw_text = "\n".join(lines).strip()

            parsed = json.loads(raw_text)
            logger.info(f"Successfully extracted handwritten diagram using {model_name}")
            parsed["engine_used"] = model_name
            return parsed

        except Exception as e:
            logger.warning(f"Vision model {model_name} failed: {e}. Trying next fallback...")
            last_err = e

    raise RuntimeError(f"All multimodal vision models failed for handwritten extraction: {last_err}")


def extract_handwritten_diagram_text(
    file_path: str,
    filename: str,
    use_vision: bool = True
) -> Dict[str, Any]:
    """
    High-level entry point for handwritten and hand-drawn diagram OCR.
    1. Validates and normalizes image with OpenCV (shadow removal, contrast optimization).
    2. Uses Gemini Multimodal Vision for near-perfect handwriting transcription.
    3. Normalizes detections to standard bounding boxes, plain text, and page structure.
    4. Provides local PaddleOCR fallback if vision service is offline or unconfigured.
    """
    ext = os.path.splitext(filename)[1].lower()
    if ext not in SUPPORTED_IMAGE_EXTS:
        raise ValueError(f"Unsupported format for handwritten extraction: {ext}")

    is_valid, err_msg = validate_image_file(file_path)
    if not is_valid:
        raise ValueError(err_msg or "Invalid image file")

    # Step 1: Preprocess with shadow cancellation and stroke enhancement
    enhanced_bgr = preprocess_handwritten_diagram(file_path)

    # Encode enhanced image to PNG bytes for vision input
    success, buffer = cv2.imencode(".png", enhanced_bgr)
    if not success:
        # Fallback to reading raw file bytes
        with open(file_path, "rb") as f:
            image_bytes = f.read()
    else:
        image_bytes = buffer.tobytes()

    # Step 2: Attempt Vision extraction if enabled and key is present
    if use_vision and GEMINI_API_KEY:
        try:
            vision_data = extract_handwritten_with_vision(image_bytes, mime_type="image/png")
            
            raw_detections = vision_data.get("detections", [])
            normalized_detections = []
            
            for item in raw_detections:
                text = str(item.get("text", "")).strip()
                if not text:
                    continue
                bbox = item.get("bounding_box", [])
                conf = float(item.get("confidence", 0.95))
                normalized_detections.append({
                    "text": text,
                    "confidence": round(conf, 4),
                    "bounding_box": bbox,
                    "element_type": item.get("element_type", "component_box")
                })

            plain_text = vision_data.get("plain_text") or "\n".join([d["text"] for d in normalized_detections])

            pages_output = [
                {
                    "page": 1,
                    "text": plain_text,
                    "detections": normalized_detections
                }
            ]

            return {
                "success": True,
                "filename": filename,
                "format": ext,
                "extraction_engine": "gemini_vision",
                "model_used": vision_data.get("engine_used", "gemini-vision"),
                "diagram_type": vision_data.get("diagram_type", "handwritten_sketch"),
                "is_handwritten": True,
                "handwriting_quality": vision_data.get("handwriting_quality", "legible"),
                "total_pages": 1,
                "pages_processed": 1,
                "pages": pages_output,
                "total_detections": len(normalized_detections),
                "detected_text": normalized_detections,
                "plain_text": plain_text,
                "relationships": vision_data.get("relationships", [])
            }

        except Exception as vision_err:
            logger.warning(f"Handwritten vision extraction encountered error: {vision_err}. Falling back to local OCR...")

    # Step 3: Local PaddleOCR Fallback with shadow-corrected preprocessed image
    from app.services.ocr import get_ocr_model, _process_ocr_result, sort_detections_spatially
    
    ocr_model = get_ocr_model()
    temp_img_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            temp_img_path = tmp.name
        cv2.imwrite(temp_img_path, enhanced_bgr)
        
        res = ocr_model.predict(temp_img_path)
    finally:
        if temp_img_path and os.path.exists(temp_img_path):
            try:
                os.remove(temp_img_path)
            except Exception:
                pass

    if not res or len(res) == 0:
        raise ValueError("No text detected in handwritten image.")

    raw_detections, _ = _process_ocr_result(res[0], min_confidence=0.20)
    if not raw_detections:
        raise ValueError("No legible text detected in handwritten image.")

    sorted_detections = sort_detections_spatially(raw_detections)
    plain_text = "\n".join([d["text"] for d in sorted_detections])

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
        "format": ext,
        "extraction_engine": "paddleocr_handwritten",
        "diagram_type": "handwritten_sketch",
        "is_handwritten": True,
        "total_pages": 1,
        "pages_processed": 1,
        "pages": pages_output,
        "total_detections": len(sorted_detections),
        "detected_text": sorted_detections,
        "plain_text": plain_text,
        "relationships": []
    }
