import os
import logging
from typing import Tuple, Optional, Dict, Any, List, Union
import numpy as np
import cv2
from PIL import Image

logger = logging.getLogger("image_processing")

SUPPORTED_IMAGE_EXTS = {".png", ".jpg", ".jpeg"}
SUPPORTED_EXTS = {".png", ".jpg", ".jpeg", ".pdf"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB

# Magic byte signatures
MAGIC_BYTES = {
    ".png": b"\x89PNG\r\n\x1a\n",
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
    ".pdf": b"%PDF-"
}

def validate_image_file(file_path: str) -> Tuple[bool, Optional[str]]:
    """
    Validates that a file is an uncorrupted, readable PNG or JPG/JPEG image.
    Returns (is_valid, error_message).
    """
    if not os.path.exists(file_path):
        return False, "Image file is corrupted or unreadable."
    
    file_size = os.path.getsize(file_path)
    if file_size == 0:
        return False, "Image file is corrupted or unreadable."

    try:
        # Check header magic bytes
        with open(file_path, "rb") as f:
            header = f.read(16)
        
        is_png = header.startswith(b"\x89PNG")
        is_jpeg = header.startswith(b"\xff\xd8\xff")
        if not (is_png or is_jpeg):
            return False, "Image file is corrupted or unreadable."

        # Verify integrity with PIL
        with Image.open(file_path) as img:
            img.verify()

        # Check full pixel decoding with OpenCV
        test_read = cv2.imread(file_path)
        if test_read is None or test_read.size == 0:
            return False, "Image file is corrupted or unreadable."

        return True, None
    except Exception as e:
        logger.warning(f"Image validation error for {file_path}: {e}")
        return False, "Image file is corrupted or unreadable."

def validate_pdf_file(file_path: str) -> Tuple[bool, Optional[str], int]:
    """
    Validates that a file is a valid, readable, uncorrupted, non-password-protected PDF.
    Returns (is_valid, error_message, page_count).
    """
    if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
        return False, "PDF could not be processed.", 0

    import fitz
    try:
        # Check magic bytes
        with open(file_path, "rb") as f:
            header = f.read(10)
        if b"%PDF-" not in header:
            return False, "PDF could not be processed.", 0

        doc = fitz.open(file_path)
        
        if doc.is_encrypted or doc.needs_pass:
            doc.close()
            return False, "PDF could not be processed.", 0

        page_count = len(doc)
        if page_count == 0:
            doc.close()
            return False, "PDF could not be processed.", 0

        # Attempt to access pages to verify structure
        for i in range(page_count):
            _ = doc.load_page(i)

        doc.close()
        return True, None, page_count
    except Exception as e:
        logger.warning(f"PDF validation error for {file_path}: {e}")
        return False, "PDF could not be processed.", 0

def validate_file_ingestion(file_path: str, filename: str, content_type: Optional[str] = None) -> Tuple[bool, Optional[str], str]:
    """
    Full validation pipeline for uploaded files (PNG, JPG, JPEG, PDF):
    - Extension check
    - File size check
    - Magic bytes and MIME verification
    - Readability / corruption check

    Returns: (is_valid, error_message, detected_type)
    """
    ext = os.path.splitext(filename)[1].lower()
    if ext not in SUPPORTED_EXTS:
        return False, "Unsupported file format. Please upload PNG, JPG, JPEG, or PDF.", ext

    if not os.path.exists(file_path):
        return False, "File could not be found.", ext

    file_size = os.path.getsize(file_path)
    if file_size > MAX_FILE_SIZE:
        return False, "File exceeds the maximum allowed size.", ext

    if file_size == 0:
        if ext == ".pdf":
            return False, "PDF could not be processed.", ext
        else:
            return False, "Image file is corrupted or unreadable.", ext

    # MIME type check where available
    if content_type:
        content_type = content_type.lower().strip()
        allowed_mimes = {
            "image/png", "image/jpeg", "image/pjpeg", "image/jpg",
            "application/pdf", "application/x-pdf", "application/octet-stream"
        }
        if content_type not in allowed_mimes:
            return False, "Unsupported file format. Please upload PNG, JPG, JPEG, or PDF.", ext

    # Deep format readability check
    if ext in SUPPORTED_IMAGE_EXTS:
        is_valid, err_msg = validate_image_file(file_path)
        if not is_valid:
            return False, err_msg, ext
        return True, None, "image"
    elif ext == ".pdf":
        is_valid, err_msg, _ = validate_pdf_file(file_path)
        if not is_valid:
            return False, err_msg, ext
        return True, None, "pdf"

    return False, "Unsupported file format. Please upload PNG, JPG, JPEG, or PDF.", ext

def normalize_diagram_image(image_input) -> np.ndarray:
    """
    Normalizes an image (PNG, JPG, JPEG) into an optimal format for PaddleOCR:
    - Alpha channel flattened onto a clean white background.
    - Converted to BGR array for OpenCV/PaddleOCR.
    - Small diagrams upscaled to ensure legibility.
    - Contrast enhanced with CLAHE for clear component labels and connectors.
    - Subtle bilateral filtering to eliminate compression noise while preserving character edges.
    
    IMPORTANT: This operates in memory and does NOT overwrite the original uploaded file.
    """
    # 1. Load image via PIL to safely preserve color modes and alpha channels
    if isinstance(image_input, str):
        with Image.open(image_input) as pil_img:
            if pil_img.mode in ("RGBA", "LA") or (pil_img.mode == "P" and "transparency" in pil_img.info):
                pil_img = pil_img.convert("RGBA")
                white_bg = Image.new("RGBA", pil_img.size, (255, 255, 255, 255))
                composite = Image.alpha_composite(white_bg, pil_img)
                rgb_img = composite.convert("RGB")
            else:
                rgb_img = pil_img.convert("RGB")
            img = cv2.cvtColor(np.array(rgb_img), cv2.COLOR_RGB2BGR)
    elif isinstance(image_input, Image.Image):
        if image_input.mode != "RGB":
            image_input = image_input.convert("RGB")
        img = cv2.cvtColor(np.array(image_input), cv2.COLOR_RGB2BGR)
    elif isinstance(image_input, np.ndarray):
        img = image_input.copy()
        if len(img.shape) == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    else:
        raise ValueError(f"Unsupported image input type: {type(image_input)}")

    height, width = img.shape[:2]

    # 2. Rescale appropriately: only upscale very small diagrams (< 400px) and cap oversized (> 1600px)
    max_dim = max(height, width)
    min_dim = min(height, width)
    if max_dim > 1600:
        scale = 1600.0 / max_dim
        img = cv2.resize(img, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_AREA)
    elif min_dim < 400:
        scale = min(2.0, 600.0 / max(min_dim, 1))
        img = cv2.resize(img, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_LINEAR)

    # 3. Contrast Limited Adaptive Histogram Equalization (CLAHE) for crisp labels
    try:
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l_channel)
        limg = cv2.merge((cl, a_channel, b_channel))
        enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    except Exception as e:
        logger.warning(f"CLAHE contrast enhancement skipped: {e}")
        enhanced = img

    return enhanced

# Alias for backward compatibility
preprocess_diagram_image = normalize_diagram_image


def preprocess_handwritten_diagram(image_input) -> np.ndarray:
    """
    Advanced preprocessing optimized for handwritten notes, whiteboard diagrams,
    and paper sketches:
    1. Alpha flattening and standardized BGR conversion.
    2. Morphological background illumination estimation to eliminate shadows,
       phone camera vignette, and whiteboard glare.
    3. Background division normalization to flatten paper texture while enhancing faint strokes.
    4. Bilateral filtering to preserve handwritten character boundaries while removing noise.
    5. Adaptive CLAHE contrast enhancement for maximum OCR legibility.
    
    IMPORTANT: Operates in memory, does not modify or overwrite original file.
    """
    # 1. Base normalization into BGR
    img = normalize_diagram_image(image_input)
    height, width = img.shape[:2]

    try:
        # Convert to grayscale for background analysis
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 2. Estimate background illumination via morphological closing
        # Dynamic kernel size proportional to image dimensions (roughly 3-5% of image width)
        k_size = max(15, int(min(height, width) * 0.04))
        if k_size % 2 == 0:
            k_size += 1
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_size, k_size))

        # Close operation fills in dark strokes and estimates background brightness
        background = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)
        background = cv2.GaussianBlur(background, (k_size, k_size), 0)

        # 3. Background division: (gray / background) * 255
        # Avoid division by zero
        bg_float = background.astype(np.float32) + 1.0
        gray_float = gray.astype(np.float32)
        norm_float = (gray_float / bg_float) * 255.0
        norm_gray = np.clip(norm_float, 0, 255).astype(np.uint8)

        # 4. Bilateral filter to smooth out paper grain without blurring ink edges
        filtered = cv2.bilateralFilter(norm_gray, d=5, sigmaColor=50, sigmaSpace=50)

        # 5. CLAHE on the shadow-corrected luminance
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced_gray = clahe.apply(filtered)

        # Re-convert to 3-channel BGR
        enhanced_bgr = cv2.cvtColor(enhanced_gray, cv2.COLOR_GRAY2BGR)
        return enhanced_bgr

    except Exception as e:
        logger.warning(f"Handwritten preprocessing fallback to standard normalization: {e}")
        return img


def detect_handwriting_features(image_input) -> Dict[str, Any]:
    """
    Analyzes an image using Computer Vision heuristics to assess whether it contains
    handwritten text, hand-drawn shapes, or whiteboard sketches.
    
    Heuristics examined:
    1. Line orthogonality: Digital diagrams are heavily dominated by 0° and 90° lines.
       Hand-drawn sketches have high angular variance.
    2. Contour complexity / curvature: Hand-drawn lines have irregular perimeters.
    3. Background uniformity: Whiteboard/paper photos exhibit non-uniform background variance.
    
    Returns:
    {
        "is_handwritten": bool,
        "confidence": float (0.0 to 1.0),
        "diagram_type": "handwritten_sketch" | "digital_diagram" | "whiteboard",
        "details": {...}
    }
    """
    try:
        if isinstance(image_input, str):
            img = cv2.imread(image_input)
        elif isinstance(image_input, Image.Image):
            img = cv2.cvtColor(np.array(image_input.convert("RGB")), cv2.COLOR_RGB2BGR)
        elif isinstance(image_input, np.ndarray):
            img = image_input
        else:
            return {"is_handwritten": False, "confidence": 0.5, "diagram_type": "unknown"}

        if img is None or img.size == 0:
            return {"is_handwritten": False, "confidence": 0.0, "diagram_type": "unknown"}

        # Resize for fast analysis
        h, w = img.shape[:2]
        thumb_dim = 600
        scale = thumb_dim / max(h, w) if max(h, w) > thumb_dim else 1.0
        thumb = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        gray = cv2.cvtColor(thumb, cv2.COLOR_BGR2GRAY)

        # 1. Background variance test
        # Sample corner and border patches
        th_h, th_w = thumb.shape[:2]
        patch_size = 30
        corners = [
            gray[0:patch_size, 0:patch_size],
            gray[0:patch_size, th_w-patch_size:th_w],
            gray[th_h-patch_size:th_h, 0:patch_size],
            gray[th_h-patch_size:th_h, th_w-patch_size:th_w]
        ]
        corner_stds = [float(np.std(c)) for c in corners if c.size > 0]
        avg_corner_std = float(np.mean(corner_stds)) if corner_stds else 0.0

        # 2. Line angle variance test with HoughLinesP
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=40, minLineLength=25, maxLineGap=8)

        non_orthogonal_ratio = 0.5
        total_lines = 0
        if lines is not None and len(lines) > 0:
            total_lines = len(lines)
            non_ortho_count = 0
            for line in lines:
                x1, y1, x2, y2 = line[0]
                angle = abs(np.arctan2(y2 - y1, x2 - x1) * 180.0 / np.pi)
                # Check if angle is far from horizontal (0, 180) or vertical (90)
                is_horizontal = (angle <= 12) or (angle >= 168)
                is_vertical = (78 <= angle <= 102)
                if not (is_horizontal or is_vertical):
                    non_ortho_count += 1
            non_orthogonal_ratio = non_ortho_count / max(total_lines, 1)

        # 3. Contour roughness test
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        rough_contours = 0
        valid_contours = 0
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > 40:
                valid_contours += 1
                perimeter = cv2.arcLength(cnt, True)
                if area > 0:
                    circularity = 4 * np.pi * area / (perimeter * perimeter)
                    if circularity < 0.25:  # Irregular, squiggly contour
                        rough_contours += 1
        rough_ratio = rough_contours / max(valid_contours, 1)

        # Calculate composite score (0.0 = cleanly digital, 1.0 = clearly handwritten/sketch)
        score = (
            (0.45 * non_orthogonal_ratio) +
            (0.35 * rough_ratio) +
            (0.20 * min(1.0, avg_corner_std / 15.0))
        )

        is_handwritten = score >= 0.42
        diagram_type = "handwritten_sketch" if is_handwritten else "digital_diagram"
        if is_handwritten and avg_corner_std > 18.0:
            diagram_type = "whiteboard"

        return {
            "is_handwritten": is_handwritten,
            "confidence": round(float(score), 3),
            "diagram_type": diagram_type,
            "metrics": {
                "non_orthogonal_ratio": round(non_orthogonal_ratio, 3),
                "rough_contour_ratio": round(rough_ratio, 3),
                "background_noise_std": round(avg_corner_std, 2),
                "detected_lines_count": total_lines
            }
        }
    except Exception as e:
        logger.warning(f"Handwriting heuristic detection failed: {e}")
        return {
            "is_handwritten": False,
            "confidence": 0.5,
            "diagram_type": "unknown",
            "error": str(e)
        }

