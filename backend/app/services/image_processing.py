import os
import logging
from typing import Tuple, Optional
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

    # 2. Rescale small diagrams to ensure OCR legible text (minimum dimension 1200px)
    min_dim = min(height, width)
    if min_dim < 1000:
        scale = max(1.5, 1200.0 / max(min_dim, 1))
        new_width = int(width * scale)
        new_height = int(height * scale)
        img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
        height, width = img.shape[:2]

    # 3. Contrast Limited Adaptive Histogram Equalization (CLAHE) on L channel in LAB color space
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

    # 4. Light bilateral filter to eliminate compression noise while preserving sharp diagram text boundaries
    try:
        denoised = cv2.bilateralFilter(enhanced, d=5, sigmaColor=50, sigmaSpace=50)
    except Exception:
        denoised = enhanced

    return denoised

# Alias for backward compatibility
preprocess_diagram_image = normalize_diagram_image
