import os
import sys
import tempfile
import json
from PIL import Image, ImageDraw
import fitz  # PyMuPDF
from fastapi.testclient import TestClient

# Ensure backend root is on path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app
from app.services.ocr import initialize_ocr, extract_text_from_file
from app.auth import get_current_user
from app.models import User

# Test user override
test_user = User(id=999, username="test_team_d_user", hashed_password="pw")
app.dependency_overrides[get_current_user] = lambda: test_user

client = TestClient(app)

def create_image_diagram(fmt="PNG", width=800, height=400):
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    # Box 1
    draw.rectangle([50, 100, 250, 200], fill=(220, 240, 255), outline=(0, 100, 200), width=2)
    draw.text((70, 140), "React Client App", fill=(0, 0, 0))
    # Box 2
    draw.rectangle([350, 100, 550, 200], fill=(230, 230, 255), outline=(100, 0, 200), width=2)
    draw.text((370, 140), "FastAPI Backend Server", fill=(0, 0, 0))
    # Box 3
    draw.rectangle([600, 100, 750, 200], fill=(255, 240, 220), outline=(200, 100, 0), width=2)
    draw.text((620, 140), "PostgreSQL Database", fill=(0, 0, 0))

    draw.line([(250, 150), (350, 150)], fill=(0, 0, 0), width=2)
    draw.line([(550, 150), (600, 150)], fill=(0, 0, 0), width=2)

    ext = fmt.lower()
    tmp = tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False)
    tmp_path = tmp.name
    tmp.close()
    img.save(tmp_path, format=fmt)
    return tmp_path

def create_single_page_pdf():
    doc = fitz.open()
    p = doc.new_page(width=800, height=500)
    p.draw_rect(fitz.Rect(50, 50, 750, 450), color=(0.8, 0.8, 0.8), fill=(0.98, 0.98, 0.98))
    p.insert_text(fitz.Point(70, 100), "Architecture Blueprint: Core Microservices", fontsize=18, fontname="helv", color=(0.1, 0.2, 0.4))
    p.draw_rect(fitz.Rect(100, 180, 320, 280), color=(0.2, 0.4, 0.8), fill=(0.9, 0.95, 1.0))
    p.insert_text(fitz.Point(120, 235), "API Gateway NGINX", fontsize=14, fontname="helv", color=(0, 0, 0))
    p.draw_rect(fitz.Rect(450, 180, 680, 280), color=(0.5, 0.2, 0.8), fill=(0.95, 0.9, 1.0))
    p.insert_text(fitz.Point(470, 235), "FastAPI Microservices", fontsize=14, fontname="helv", color=(0, 0, 0))

    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    tmp_path = tmp.name
    tmp.close()
    doc.save(tmp_path)
    doc.close()
    return tmp_path

def create_multipage_pdf(pages=3):
    doc = fitz.open()
    titles = [
        ("Page 1: Ingress Layer", "Cloudflare CDN and Edge WAF"),
        ("Page 2: Application Layer", "FastAPI Core Application Services"),
        ("Page 3: Persistence Layer", "PostgreSQL Database and Redis Cache")
    ]
    for i in range(pages):
        p = doc.new_page(width=800, height=500)
        p.draw_rect(fitz.Rect(50, 50, 750, 450), color=(0.8, 0.8, 0.8), fill=(0.98, 0.98, 0.98))
        h_text, b_text = titles[i % len(titles)]
        p.insert_text(fitz.Point(70, 100), f"Tier Specification - {h_text}", fontsize=18, fontname="helv", color=(0.1, 0.2, 0.4))
        p.draw_rect(fitz.Rect(100, 200, 500, 300), color=(0.2, 0.5, 0.3), fill=(0.9, 1.0, 0.9))
        p.insert_text(fitz.Point(120, 255), b_text, fontsize=14, fontname="helv", color=(0, 0, 0))

    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    tmp_path = tmp.name
    tmp.close()
    doc.save(tmp_path)
    doc.close()
    return tmp_path

def run_all_compatibility_tests():
    initialize_ocr()
    records = []

    test_cases = [
        ("PNG", lambda: create_image_diagram("PNG"), "architecture.png", "image/png"),
        ("JPG", lambda: create_image_diagram("JPEG"), "architecture.jpg", "image/jpeg"),
        ("JPEG", lambda: create_image_diagram("JPEG"), "architecture.jpeg", "image/jpeg"),
        ("Single-page PDF", create_single_page_pdf, "single_page.pdf", "application/pdf"),
        ("Multi-page PDF", lambda: create_multipage_pdf(3), "multipage_blueprint.pdf", "application/pdf"),
        ("Invalid file", lambda: create_dummy_file(b"Just plain text", ".txt"), "notes.txt", "text/plain"),
        ("Corrupted image", lambda: create_dummy_file(b"CORRUPTED_GARBAGE_HEADER_DATA", ".png"), "corrupt.png", "image/png"),
    ]

    print("\n" + "="*80)
    print("TEAM D: FILE COMPATIBILITY & INGESTION PIPELINE VERIFICATION")
    print("="*80)

    for name, creator_fn, filename, mime in test_cases:
        file_path = creator_fn()
        record = {
            "test_name": name,
            "filename": filename,
            "upload_result": None,
            "ocr_result": None,
            "pages_processed": 0,
            "analysis_result": None,
            "error": None
        }

        try:
            # 1. Test Upload Endpoint
            with open(file_path, "rb") as f:
                upload_res = client.post(
                    "/api/diagrams/upload",
                    files={"file": (filename, f, mime)}
                )

            if upload_res.status_code == 201:
                diagram_data = upload_res.json()
                upload_id = diagram_data["id"]
                record["upload_result"] = f"SUCCESS (HTTP 201, ID: {upload_id[:8]}...)"
                
                # 2. Test OCR Processing directly
                ocr_res = extract_text_from_file(file_path, filename)
                record["ocr_result"] = f"SUCCESS ({ocr_res['total_detections']} detections)"
                record["pages_processed"] = ocr_res.get("pages_processed", 1)
                
                # 3. Test Analyze Endpoint (or mock verify)
                analyze_res = client.post(f"/api/analyze/{upload_id}")
                if analyze_res.status_code == 200:
                    analysis_data = analyze_res.json().get("analysis", {})
                    # Verify 6-section schema
                    required = ["summary", "workflow", "tech_stack", "components", "suggested_apis", "database_schema"]
                    if all(k in analysis_data for k in required):
                        record["analysis_result"] = "SUCCESS (6/6 schema sections valid)"
                    else:
                        record["analysis_result"] = "PARTIAL (schema incomplete)"
                elif analyze_res.status_code == 429:
                    # Quota reached for Gemini during tests
                    record["analysis_result"] = "LLM_QUOTA_EXCEEDED (gracefully handled)"
                else:
                    record["analysis_result"] = f"HTTP {analyze_res.status_code}"

            else:
                err_detail = upload_res.json().get("detail", "Upload rejected")
                record["upload_result"] = f"REJECTED (HTTP {upload_res.status_code})"
                record["error"] = err_detail
                record["ocr_result"] = "SKIPPED"
                record["analysis_result"] = "SKIPPED"

        except Exception as ex:
            record["error"] = str(ex)
            if not record["upload_result"]:
                record["upload_result"] = "EXCEPTION"
            if not record["ocr_result"]:
                record["ocr_result"] = "FAILED"
            if not record["analysis_result"]:
                record["analysis_result"] = "FAILED"
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)

        records.append(record)

    # Print summary results table
    print("\n" + "-"*105)
    print(f"{'TEST CASE':<18} | {'UPLOAD RESULT':<16} | {'PAGES':<6} | {'OCR RESULT':<24} | {'ANALYSIS / ERROR':<32}")
    print("-"*105)
    for r in records:
        status_or_err = r['error'] if r['error'] else (r['analysis_result'] or 'N/A')
        print(f"{r['test_name']:<18} | {r['upload_result']:<16} | {r['pages_processed']:<6} | {r['ocr_result']:<24} | {status_or_err:<32}")
    print("-"*105)

    # Save results to JSON artifact
    out_path = os.path.join(BACKEND_DIR, "test_file_compatibility_results.json")
    with open(out_path, "w") as f:
        json.dump(records, f, indent=2)
    print(f"\nResults saved to {out_path}")

def create_dummy_file(content: bytes, ext: str) -> str:
    tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    tmp_path = tmp.name
    tmp.write(content)
    tmp.close()
    return tmp_path

if __name__ == "__main__":
    run_all_compatibility_tests()
