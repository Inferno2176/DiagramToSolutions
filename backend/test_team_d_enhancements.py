import os
import sys
import tempfile
import json
import unittest
from PIL import Image, ImageDraw, ImageFont
import fitz  # PyMuPDF

# Ensure backend root is on path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.services.image_processing import validate_image_file, preprocess_diagram_image
from app.services.ocr import (
    initialize_ocr,
    extract_text_from_file,
    sort_detections_spatially,
    ALL_SUPPORTED_EXTS
)

def create_sample_diagram_image(fmt: str = "PNG") -> str:
    """Creates a sample architecture diagram image with clear text boxes."""
    img = Image.new("RGB", (1200, 600), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Box 1: Client
    draw.rectangle([50, 200, 250, 300], fill=(220, 240, 255), outline=(0, 100, 200), width=3)
    draw.text((80, 240), "React Client\nSPA Frontend", fill=(0, 0, 0))

    # Box 2: API Gateway
    draw.rectangle([350, 200, 550, 300], fill=(230, 230, 255), outline=(100, 0, 200), width=3)
    draw.text((380, 240), "API Gateway\nFastAPI Server", fill=(0, 0, 0))

    # Box 3: Auth & Microservices
    draw.rectangle([650, 100, 880, 200], fill=(230, 255, 230), outline=(0, 150, 50), width=3)
    draw.text((680, 140), "Auth Service\nOAuth2 / JWT", fill=(0, 0, 0))

    # Box 4: Database
    draw.rectangle([650, 320, 880, 420], fill=(255, 240, 220), outline=(200, 100, 0), width=3)
    draw.text((680, 360), "PostgreSQL Database\nPersistent Storage", fill=(0, 0, 0))

    # Connectors
    draw.line([(250, 250), (350, 250)], fill=(100, 100, 100), width=3)
    draw.line([(550, 250), (650, 150)], fill=(100, 100, 100), width=3)
    draw.line([(550, 250), (650, 370)], fill=(100, 100, 100), width=3)

    ext = fmt.lower()
    if ext == "jpeg":
        ext = "jpg"
    tmp = tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False)
    tmp_path = tmp.name
    tmp.close()
    img.save(tmp_path, format=fmt)
    return tmp_path

def create_sample_svg_diagram() -> str:
    """Creates a sample SVG architecture diagram."""
    svg_content = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="500" viewBox="0 0 1000 500">
  <rect width="1000" height="500" fill="#FFFFFF"/>
  
  <!-- Ingress -->
  <rect x="50" y="200" width="200" height="100" rx="10" fill="#E0F2FE" stroke="#0284C7" stroke-width="2"/>
  <text x="70" y="250" font-family="Arial" font-size="18" fill="#0F172A">Cloudflare CDN / DNS</text>
  
  <!-- Backend -->
  <rect x="350" y="200" width="220" height="100" rx="10" fill="#F3E8FF" stroke="#9333EA" stroke-width="2"/>
  <text x="370" y="245" font-family="Arial" font-size="18" fill="#0F172A">FastAPI Gateway</text>
  <text x="370" y="275" font-family="Arial" font-size="14" fill="#64748B">Python Async Core</text>
  
  <!-- Cache -->
  <rect x="680" y="100" width="220" height="90" rx="10" fill="#FEF08A" stroke="#CA8A04" stroke-width="2"/>
  <text x="700" y="150" font-family="Arial" font-size="18" fill="#0F172A">Redis Cache Cluster</text>
  
  <!-- Storage -->
  <rect x="680" y="280" width="220" height="90" rx="10" fill="#DCFCE7" stroke="#16A34A" stroke-width="2"/>
  <text x="700" y="330" font-family="Arial" font-size="18" fill="#0F172A">PostgreSQL Replica</text>
</svg>"""
    tmp = tempfile.NamedTemporaryFile(suffix=".svg", delete=False, mode="w", encoding="utf-8")
    tmp_path = tmp.name
    tmp.write(svg_content)
    tmp.close()
    return tmp_path

def create_sample_multipage_pdf() -> str:
    """Creates a multi-page PDF blueprint with vector labels and diagram layout."""
    doc = fitz.open()

    # Page 1: Edge & Application tier
    p1 = doc.new_page(width=800, height=600)
    p1.draw_rect(fitz.Rect(50, 50, 750, 550), color=(0.8, 0.8, 0.8), fill=(0.98, 0.98, 0.98))
    p1.insert_text(fitz.Point(70, 90), "Tier 1: Ingress and Web Layer", fontsize=20, fontname="helv", color=(0.1, 0.2, 0.4))
    
    p1.draw_rect(fitz.Rect(100, 150, 300, 250), color=(0.2, 0.4, 0.8), fill=(0.9, 0.95, 1.0))
    p1.insert_text(fitz.Point(120, 205), "Load Balancer NGINX", fontsize=14, fontname="helv", color=(0, 0, 0))
    
    p1.draw_rect(fitz.Rect(450, 150, 680, 250), color=(0.5, 0.2, 0.8), fill=(0.95, 0.9, 1.0))
    p1.insert_text(fitz.Point(470, 205), "FastAPI Microservices", fontsize=14, fontname="helv", color=(0, 0, 0))

    # Page 2: Persistence & Cache tier
    p2 = doc.new_page(width=800, height=600)
    p2.draw_rect(fitz.Rect(50, 50, 750, 550), color=(0.8, 0.8, 0.8), fill=(0.98, 0.98, 0.98))
    p2.insert_text(fitz.Point(70, 90), "Tier 2: Persistence and Message Brokers", fontsize=20, fontname="helv", color=(0.1, 0.2, 0.4))
    
    p2.draw_rect(fitz.Rect(100, 150, 320, 250), color=(0.8, 0.4, 0.1), fill=(1.0, 0.95, 0.9))
    p2.insert_text(fitz.Point(120, 205), "PostgreSQL Database Engine", fontsize=14, fontname="helv", color=(0, 0, 0))
    
    p2.draw_rect(fitz.Rect(450, 150, 680, 250), color=(0.1, 0.6, 0.3), fill=(0.9, 1.0, 0.95))
    p2.insert_text(fitz.Point(470, 205), "RabbitMQ Message Queue", fontsize=14, fontname="helv", color=(0, 0, 0))

    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    tmp_path = tmp.name
    tmp.close()
    doc.save(tmp_path)
    doc.close()
    return tmp_path

class TestTeamDEnhancements(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        initialize_ocr()

    def test_image_preprocessing(self):
        """Validates that preprocessing sharpens, rescales, and handles channels."""
        test_png = create_sample_diagram_image("PNG")
        try:
            is_valid, err = validate_image_file(test_png)
            self.assertTrue(is_valid)
            self.assertIsNone(err)

            preprocessed = preprocess_diagram_image(test_png)
            self.assertIsNotNone(preprocessed)
            self.assertEqual(len(preprocessed.shape), 3)
            self.assertEqual(preprocessed.shape[2], 3)
            # Minimum dimension scaled
            self.assertGreaterEqual(min(preprocessed.shape[:2]), 600)
        finally:
            if os.path.exists(test_png):
                os.remove(test_png)

    def test_corrupted_file_detection(self):
        """Validates that empty or corrupted files are caught cleanly."""
        # Empty file
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(b"")
            empty_path = f.name

        try:
            is_valid, err = validate_image_file(empty_path)
            self.assertFalse(is_valid)
            self.assertIn("empty", err.lower())

            with self.assertRaises(ValueError):
                extract_text_from_file(empty_path, "empty.png")
        finally:
            if os.path.exists(empty_path):
                os.remove(empty_path)

        # Corrupt file (garbage bytes with .png extension)
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(b"NOT_A_REAL_PNG_HEADER_RANDOM_GARBAGE_BYTES")
            corrupt_path = f.name

        try:
            is_valid, err = validate_image_file(corrupt_path)
            self.assertFalse(is_valid)
            self.assertIn("corrupted", err.lower())
        finally:
            if os.path.exists(corrupt_path):
                os.remove(corrupt_path)

    def test_png_diagram_extraction(self):
        """Validates PNG diagram extraction with spatial ordering."""
        png_path = create_sample_diagram_image("PNG")
        try:
            result = extract_text_from_file(png_path, "architecture.png")
            self.assertTrue(result["success"])
            self.assertEqual(result["format"], ".png")
            self.assertGreater(result["total_detections"], 0)
            self.assertIn("FastAPI", result["plain_text"])
            self.assertIn("Postgre", result["plain_text"])
        finally:
            if os.path.exists(png_path):
                os.remove(png_path)

    def test_webp_diagram_extraction(self):
        """Validates WEBP diagram extraction (previously unsupported)."""
        webp_path = create_sample_diagram_image("WEBP")
        try:
            result = extract_text_from_file(webp_path, "architecture.webp")
            self.assertTrue(result["success"])
            self.assertEqual(result["format"], ".webp")
            self.assertGreater(result["total_detections"], 0)
            self.assertIn("FastAPI", result["plain_text"])
        finally:
            if os.path.exists(webp_path):
                os.remove(webp_path)

    def test_svg_diagram_extraction(self):
        """Validates SVG diagram extraction (previously unsupported)."""
        svg_path = create_sample_svg_diagram()
        try:
            result = extract_text_from_file(svg_path, "cloud_system.svg")
            self.assertTrue(result["success"])
            self.assertEqual(result["format"], ".svg")
            self.assertGreater(result["total_detections"], 0)
            text = result["plain_text"]
            self.assertIn("Cloudflare", text)
            self.assertIn("FastAPI", text)
            self.assertIn("PostgreSQL", text)
            self.assertIn("Redis", text)
        finally:
            if os.path.exists(svg_path):
                os.remove(svg_path)

    def test_multipage_pdf_diagram_extraction(self):
        """Validates multi-page PDF diagram with dual native+OCR extraction."""
        pdf_path = create_sample_multipage_pdf()
        try:
            result = extract_text_from_file(pdf_path, "system_architecture.pdf")
            self.assertTrue(result["success"])
            self.assertEqual(result["format"], ".pdf")
            self.assertGreater(result["total_detections"], 0)
            text = result["plain_text"]
            self.assertIn("NGINX", text)
            self.assertIn("FastAPI", text)
            self.assertIn("PostgreSQL", text)
            self.assertIn("RabbitMQ", text)
        finally:
            if os.path.exists(pdf_path):
                os.remove(pdf_path)

    def test_spatial_sorting(self):
        """Validates that detections are sorted top-to-bottom, left-to-right."""
        sample_detections = [
            {"text": "Bottom-Right", "bounding_box": [[500, 400], [600, 400], [600, 450], [500, 450]]},
            {"text": "Top-Left", "bounding_box": [[50, 50], [150, 50], [150, 80], [50, 80]]},
            {"text": "Top-Right", "bounding_box": [[500, 50], [600, 50], [600, 80], [500, 80]]},
            {"text": "Bottom-Left", "bounding_box": [[50, 400], [150, 400], [150, 450], [50, 450]]}
        ]
        sorted_res = sort_detections_spatially(sample_detections, y_threshold=30)
        ordered_texts = [d["text"] for d in sorted_res]
        self.assertEqual(ordered_texts, ["Top-Left", "Top-Right", "Bottom-Left", "Bottom-Right"])

if __name__ == "__main__":
    unittest.main()
