import os
import sys
import json
import asyncio
from PIL import Image, ImageDraw

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.services.image_processing import (
    detect_handwriting_features,
    preprocess_handwritten_diagram,
    normalize_diagram_image
)
from app.services.ocr import initialize_ocr, extract_text_from_file
from app.services.handwritten_ocr import extract_handwritten_diagram_text
from app.services.llm import analyze_architecture_gemini

def create_sample_handdrawn_diagram(output_path: str):
    """
    Creates a simulated hand-drawn / whiteboard architecture diagram with
    slanted connector lines, rough polygons, and handwriting labels.
    """
    img = Image.new("RGB", (900, 500), color=(248, 246, 240))
    draw = ImageDraw.Draw(img)

    # 1. Component 1: React Client (Rough Box)
    draw.polygon([(60, 150), (280, 140), (270, 270), (55, 260)], outline=(35, 45, 40), width=3)
    draw.text((80, 190), "React Client (SPA)\nHandwritten Sketch", fill=(20, 25, 20))

    # 2. Connector 1: Arrow to API Gateway
    draw.line([(280, 200), (420, 205)], fill=(40, 50, 45), width=3)
    draw.polygon([(420, 205), (405, 195), (405, 215)], fill=(40, 50, 45))
    draw.text((295, 180), "HTTPS / GraphQL", fill=(50, 60, 50))

    # 3. Component 2: API Gateway & Auth Service
    draw.polygon([(430, 140), (660, 135), (650, 275), (425, 265)], outline=(35, 45, 40), width=3)
    draw.text((445, 190), "FastAPI Gateway\nJWT Auth & Router", fill=(20, 25, 20))

    # 4. Connector 2: Arrow to Database
    draw.line([(660, 205), (750, 205)], fill=(40, 50, 45), width=3)
    draw.polygon([(750, 205), (735, 195), (735, 215)], fill=(40, 50, 45))
    draw.text((670, 180), "SQL Query", fill=(50, 60, 50))

    # 5. Component 3: Relational DB
    draw.polygon([(760, 150), (870, 145), (865, 270), (755, 265)], outline=(35, 45, 40), width=3)
    draw.text((770, 190), "PostgreSQL\nPrimary DB", fill=(20, 25, 20))

    img.save(output_path)
    return output_path


async def run_e2e_tests():
    print("=" * 60)
    print("STARTING HANDWRITTEN / HAND-DRAWN OCR E2E TEST SUITE")
    print("=" * 60)

    # 1. Initialize local OCR
    print("\n[Step 1] Initializing PaddleOCR model...")
    initialize_ocr()
    print("PaddleOCR ready.")

    # 2. Generate test sketch
    sketch_path = os.path.join(BACKEND_DIR, "test_handdrawn_e2e_sketch.png")
    create_sample_handdrawn_diagram(sketch_path)
    print(f"\n[Step 2] Created test hand-drawn diagram: {sketch_path}")

    # 3. Test OpenCV Shadow Cancellation Preprocessing
    print("\n[Step 3] Testing OpenCV shadow-removal & illumination preprocessing...")
    enhanced_bgr = preprocess_handwritten_diagram(sketch_path)
    assert enhanced_bgr is not None and enhanced_bgr.shape[0] > 0, "Preprocessing failed"
    print(f"Preprocessed image dimensions: {enhanced_bgr.shape}")

    # 4. Test Heuristic Detector
    print("\n[Step 4] Testing handwriting heuristic detection...")
    features = detect_handwriting_features(sketch_path)
    print(f"Heuristics output: {features}")

    # 5. Test Dedicated Handwritten Vision Extraction
    print("\n[Step 5] Testing extract_handwritten_diagram_text...")
    hw_result = extract_handwritten_diagram_text(sketch_path, "test_handdrawn_e2e_sketch.png")
    print(f"Handwritten OCR Success! Engine: {hw_result.get('extraction_engine')}")
    print(f"Extracted plain text:\n{hw_result.get('plain_text')}")
    print(f"Detections count: {hw_result.get('total_detections')}")
    print(f"Detected relationships: {hw_result.get('relationships')}")

    assert hw_result.get("total_detections", 0) > 0, "Zero detections in handwritten test"
    assert "React Client" in hw_result.get("plain_text", "") or "FastAPI" in hw_result.get("plain_text", ""), "Expected components not transcribed"

    # 6. Test extract_text_from_file with mode='handwritten'
    print("\n[Step 6] Testing extract_text_from_file(..., mode='handwritten')...")
    mode_hw_res = extract_text_from_file(sketch_path, "test_handdrawn_e2e_sketch.png", mode="handwritten")
    assert mode_hw_res.get("success") is True, "extract_text_from_file mode='handwritten' failed"
    print(f"Mode 'handwritten' extraction engine: {mode_hw_res.get('extraction_engine')}")

    # 7. Test extract_text_from_file with mode='auto'
    print("\n[Step 7] Testing extract_text_from_file(..., mode='auto')...")
    mode_auto_res = extract_text_from_file(sketch_path, "test_handdrawn_e2e_sketch.png", mode="auto")
    assert mode_auto_res.get("success") is True, "extract_text_from_file mode='auto' failed"
    print(f"Mode 'auto' extraction engine: {mode_auto_res.get('extraction_engine')}")

    # 8. Test Downstream LLM Synthesis with the extracted handwritten OCR text
    print("\n[Step 8] Testing downstream LLM Architecture Reasoning with extracted handwritten text...")
    llm_analysis = await analyze_architecture_gemini(
        ocr_text=hw_result.get("plain_text"),
        ocr_json=hw_result,
        diagram_file_path=sketch_path
    )
    print("LLM Architecture Synthesis SUCCESS!")
    print(f"Architecture Summary: {llm_analysis.get('summary', {}).get('architecture_name')}")
    print(f"Detected components count: {len(llm_analysis.get('components', []))}")
    print(f"Suggested APIs count: {len(llm_analysis.get('suggested_apis', []))}")

    print("\n" + "=" * 60)
    print("ALL HANDWRITTEN OCR E2E TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_e2e_tests())
