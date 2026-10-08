import os
import sys
from PIL import Image, ImageDraw
import fitz  # PyMuPDF

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DEMO_DIR = os.path.join(BACKEND_DIR, "demo_samples")
os.makedirs(DEMO_DIR, exist_ok=True)

def draw_arrow(draw, start, end, fill=(0, 0, 0), width=2, arrow_size=8):
    import math
    draw.line([start, end], fill=fill, width=width)
    x0, y0 = start
    x1, y1 = end
    angle = math.atan2(y1 - y0, x1 - x0)
    p1 = (x1 - arrow_size * math.cos(angle - math.pi / 6), y1 - arrow_size * math.sin(angle - math.pi / 6))
    p2 = (x1 - arrow_size * math.cos(angle + math.pi / 6), y1 - arrow_size * math.sin(angle + math.pi / 6))
    draw.polygon([end, p1, p2], fill=fill)

def generate_sample_png():
    img = Image.new("RGB", (900, 360), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    # React SPA
    draw.rectangle([50, 130, 240, 230], fill=(224, 242, 254), outline=(2, 132, 199), width=2)
    draw.text((75, 170), "React Client App\n(Web Frontend)", fill=(15, 23, 42))
    # FastAPI
    draw.rectangle([350, 130, 550, 230], fill=(243, 232, 255), outline=(147, 51, 234), width=2)
    draw.text((375, 170), "FastAPI Server\n(API Gateway)", fill=(15, 23, 42))
    # PostgreSQL
    draw.rectangle([660, 130, 850, 230], fill=(220, 252, 231), outline=(22, 163, 74), width=2)
    draw.text((685, 170), "PostgreSQL Database\n(Primary Store)", fill=(15, 23, 42))
    # Connectors
    draw_arrow(draw, (240, 180), (350, 180), fill=(2, 132, 199), width=3)
    draw.text((255, 155), "HTTP / JSON", fill=(2, 132, 199))
    draw_arrow(draw, (550, 180), (660, 180), fill=(22, 163, 74), width=3)
    draw.text((575, 155), "SQL Query", fill=(22, 163, 74))
    
    out = os.path.join(DEMO_DIR, "1_web_architecture.png")
    img.save(out)
    print(f"Generated: {out}")

def generate_sample_jpg():
    img = Image.new("RGB", (1000, 450), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([50, 180, 220, 280], fill=(254, 240, 138), outline=(202, 138, 4), width=2)
    draw.text((70, 220), "Next.js Web\nClient App", fill=(15, 23, 42))
    draw.rectangle([300, 180, 480, 280], fill=(224, 242, 254), outline=(2, 132, 199), width=2)
    draw.text((320, 220), "NGINX Reverse\nProxy Ingress", fill=(15, 23, 42))
    draw.rectangle([560, 90, 750, 190], fill=(243, 232, 255), outline=(147, 51, 234), width=2)
    draw.text((580, 130), "Auth Service\nOAuth2 / JWT", fill=(15, 23, 42))
    draw.rectangle([560, 260, 750, 360], fill=(243, 232, 255), outline=(147, 51, 234), width=2)
    draw.text((580, 300), "Order Service\nFastAPI Application", fill=(15, 23, 42))
    draw.rectangle([820, 180, 960, 280], fill=(220, 252, 231), outline=(22, 163, 74), width=2)
    draw.text((840, 220), "PostgreSQL DB\nPersistent Data", fill=(15, 23, 42))

    draw_arrow(draw, (220, 230), (300, 230), fill=(202, 138, 4), width=2)
    draw_arrow(draw, (480, 210), (560, 140), fill=(147, 51, 234), width=2)
    draw_arrow(draw, (480, 250), (560, 310), fill=(147, 51, 234), width=2)
    draw_arrow(draw, (750, 140), (820, 210), fill=(22, 163, 74), width=2)
    draw_arrow(draw, (750, 310), (820, 250), fill=(22, 163, 74), width=2)

    out = os.path.join(DEMO_DIR, "2_microservices_app.jpg")
    img.save(out, "JPEG")
    print(f"Generated: {out}")

def generate_sample_pdf():
    doc = fitz.open()
    # Page 1
    p1 = doc.new_page(width=800, height=500)
    p1.draw_rect(fitz.Rect(40, 40, 760, 460), color=(0.8, 0.8, 0.8), fill=(0.98, 0.98, 0.98))
    p1.insert_text(fitz.Point(60, 80), "Cloud Blueprint - Page 1: Ingress & Load Balancing", fontsize=16, fontname="helv", color=(0.1, 0.2, 0.4))
    p1.draw_rect(fitz.Rect(80, 160, 280, 260), color=(0.2, 0.4, 0.8), fill=(0.9, 0.95, 1.0))
    p1.insert_text(fitz.Point(100, 215), "Cloudflare Edge CDN", fontsize=14, fontname="helv", color=(0, 0, 0))
    p1.draw_rect(fitz.Rect(420, 160, 680, 260), color=(0.5, 0.2, 0.8), fill=(0.95, 0.9, 1.0))
    p1.insert_text(fitz.Point(440, 215), "AWS Application Load Balancer", fontsize=14, fontname="helv", color=(0, 0, 0))

    # Page 2
    p2 = doc.new_page(width=800, height=500)
    p2.draw_rect(fitz.Rect(40, 40, 760, 460), color=(0.8, 0.8, 0.8), fill=(0.98, 0.98, 0.98))
    p2.insert_text(fitz.Point(60, 80), "Cloud Blueprint - Page 2: Compute & Data Tier", fontsize=16, fontname="helv", color=(0.1, 0.2, 0.4))
    p2.draw_rect(fitz.Rect(80, 160, 320, 260), color=(0.8, 0.4, 0.1), fill=(1.0, 0.95, 0.9))
    p2.insert_text(fitz.Point(100, 215), "ECS Fargate Microservices", fontsize=14, fontname="helv", color=(0, 0, 0))
    p2.draw_rect(fitz.Rect(440, 160, 680, 260), color=(0.1, 0.6, 0.3), fill=(0.9, 1.0, 0.95))
    p2.insert_text(fitz.Point(460, 215), "Amazon Aurora PostgreSQL DB", fontsize=14, fontname="helv", color=(0, 0, 0))

    out = os.path.join(DEMO_DIR, "3_multipage_cloud_blueprint.pdf")
    doc.save(out)
    doc.close()
    print(f"Generated: {out}")

def generate_invalid_samples():
    corrupt_png = os.path.join(DEMO_DIR, "corrupt_diagram.png")
    with open(corrupt_png, "wb") as f:
        f.write(b"CORRUPT_NOT_A_REAL_IMAGE_BYTES")
    print(f"Generated: {corrupt_png}")

    invalid_txt = os.path.join(DEMO_DIR, "unsupported_diagram.txt")
    with open(invalid_txt, "w") as f:
        f.write("System architecture description in text")
    print(f"Generated: {invalid_txt}")

if __name__ == "__main__":
    generate_sample_png()
    generate_sample_jpg()
    generate_sample_pdf()
    generate_invalid_samples()
