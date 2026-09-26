import os
import sys
import tempfile
import json
import asyncio
from PIL import Image, ImageDraw, ImageFont

# Ensure backend root is on path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.services.ocr import initialize_ocr, extract_text_from_file
from app.services.llm import analyze_architecture_gemini

def draw_arrow(draw, start, end, fill=(0, 0, 0), width=2, arrow_size=8):
    """Draws a line with an arrowhead at the end point."""
    draw.line([start, end], fill=fill, width=width)
    x0, y0 = start
    x1, y1 = end
    import math
    angle = math.atan2(y1 - y0, x1 - x0)
    p1 = (x1 - arrow_size * math.cos(angle - math.pi / 6), y1 - arrow_size * math.sin(angle - math.pi / 6))
    p2 = (x1 - arrow_size * math.cos(angle + math.pi / 6), y1 - arrow_size * math.sin(angle + math.pi / 6))
    draw.polygon([end, p1, p2], fill=fill)

def create_simple_architecture_diagram():
    """Diagram 1: Simple Web Architecture (React Client -> FastAPI -> PostgreSQL)."""
    img = Image.new("RGB", (900, 350), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Box 1: Client
    draw.rectangle([50, 120, 240, 220], fill=(224, 242, 254), outline=(2, 132, 199), width=2)
    draw.text((75, 160), "React Client\n(Browser SPA)", fill=(15, 23, 42))

    # Box 2: API Gateway / Backend
    draw.rectangle([350, 120, 550, 220], fill=(243, 232, 255), outline=(147, 51, 234), width=2)
    draw.text((375, 160), "FastAPI Server\n(Backend REST API)", fill=(15, 23, 42))

    # Box 3: Database
    draw.rectangle([660, 120, 850, 220], fill=(220, 252, 231), outline=(22, 163, 74), width=2)
    draw.text((685, 160), "PostgreSQL Database\n(Relational DB)", fill=(15, 23, 42))

    # Arrows
    draw_arrow(draw, (240, 170), (350, 170), fill=(2, 132, 199), width=3)
    draw.text((255, 145), "HTTP / JSON", fill=(2, 132, 199))

    draw_arrow(draw, (550, 170), (660, 170), fill=(22, 163, 74), width=3)
    draw.text((570, 145), "SQL Query", fill=(22, 163, 74))

    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    tmp_path = tmp.name
    tmp.close()
    img.save(tmp_path)
    return tmp_path

def create_application_architecture_diagram():
    """Diagram 2: Microservices Application Architecture with Queues and Cache."""
    img = Image.new("RGB", (1100, 600), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Ingress
    draw.rectangle([50, 240, 220, 340], fill=(224, 242, 254), outline=(2, 132, 199), width=2)
    draw.text((70, 280), "Next.js Web Client\nFrontend App", fill=(15, 23, 42))

    draw.rectangle([300, 240, 480, 340], fill=(254, 240, 138), outline=(202, 138, 4), width=2)
    draw.text((320, 280), "NGINX Reverse Proxy\nAPI Gateway Router", fill=(15, 23, 42))

    # Microservices
    draw.rectangle([570, 120, 760, 220], fill=(243, 232, 255), outline=(147, 51, 234), width=2)
    draw.text((590, 160), "Auth Service\nOAuth2 / JWT Token", fill=(15, 23, 42))

    draw.rectangle([570, 350, 760, 450], fill=(243, 232, 255), outline=(147, 51, 234), width=2)
    draw.text((590, 390), "Order Service\nFastAPI Application", fill=(15, 23, 42))

    # Queue & Worker
    draw.rectangle([840, 350, 1020, 430], fill=(255, 237, 213), outline=(234, 88, 12), width=2)
    draw.text((860, 380), "RabbitMQ Broker\nMessage Queue", fill=(15, 23, 42))

    draw.rectangle([840, 470, 1020, 550], fill=(224, 231, 255), outline=(79, 70, 229), width=2)
    draw.text((860, 500), "Celery Worker\nAsync Job Processor", fill=(15, 23, 42))

    # Persistence
    draw.rectangle([840, 120, 1020, 220], fill=(220, 252, 231), outline=(22, 163, 74), width=2)
    draw.text((860, 160), "PostgreSQL DB\nPrimary Storage", fill=(15, 23, 42))

    draw.rectangle([570, 490, 760, 570], fill=(254, 226, 226), outline=(220, 38, 38), width=2)
    draw.text((590, 520), "Redis Cache\nSession Store", fill=(15, 23, 42))

    # Connections
    draw_arrow(draw, (220, 290), (300, 290), fill=(2, 132, 199), width=2)
    draw_arrow(draw, (480, 270), (570, 180), fill=(147, 51, 234), width=2)
    draw_arrow(draw, (480, 310), (570, 390), fill=(147, 51, 234), width=2)
    draw_arrow(draw, (760, 170), (840, 170), fill=(22, 163, 74), width=2)
    draw_arrow(draw, (760, 390), (840, 390), fill=(234, 88, 12), width=2)
    draw_arrow(draw, (930, 430), (930, 470), fill=(79, 70, 229), width=2)
    draw_arrow(draw, (665, 450), (665, 490), fill=(220, 38, 38), width=2)

    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    tmp_path = tmp.name
    tmp.close()
    img.save(tmp_path)
    return tmp_path

def create_cloud_network_architecture_diagram():
    """Diagram 3: Cloud & Network Architecture Diagram with VPC boundaries."""
    img = Image.new("RGB", (1200, 650), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # External Ingress
    draw.rectangle([40, 260, 200, 360], fill=(255, 237, 213), outline=(234, 88, 12), width=2)
    draw.text((55, 300), "Cloudflare CDN\nEdge WAF & DDoS", fill=(15, 23, 42))

    # AWS Cloud Boundary
    draw.rectangle([260, 50, 1150, 600], fill=(248, 250, 252), outline=(148, 163, 184), width=3)
    draw.text((280, 70), "AWS Cloud Environment (us-east-1)", fill=(71, 85, 105))

    # Public Subnet (ALB)
    draw.rectangle([300, 120, 500, 550], fill=(241, 245, 249), outline=(100, 116, 139), width=2)
    draw.text((320, 140), "Public Subnet", fill=(71, 85, 105))
    draw.rectangle([320, 260, 480, 360], fill=(224, 242, 254), outline=(2, 132, 199), width=2)
    draw.text((340, 300), "AWS ALB\nApplication Load\nBalancer", fill=(15, 23, 42))

    # Private Subnet (Compute & Persistence)
    draw.rectangle([550, 120, 1100, 550], fill=(241, 245, 249), outline=(100, 116, 139), width=2)
    draw.text((570, 140), "Private Subnet (VPC)", fill=(71, 85, 105))

    # Compute
    draw.rectangle([580, 240, 780, 370], fill=(243, 232, 255), outline=(147, 51, 234), width=2)
    draw.text((600, 280), "ECS Fargate Cluster\nMicroservices Tasks\n(Docker Containers)", fill=(15, 23, 42))

    # Persistence
    draw.rectangle([860, 180, 1060, 290], fill=(220, 252, 231), outline=(22, 163, 74), width=2)
    draw.text((880, 220), "Amazon Aurora RDS\nPostgreSQL Multi-AZ", fill=(15, 23, 42))

    draw.rectangle([860, 340, 1060, 450], fill=(254, 226, 226), outline=(220, 38, 38), width=2)
    draw.text((880, 380), "ElastiCache Redis\nCluster (In-Memory)", fill=(15, 23, 42))

    # Flow arrows
    draw_arrow(draw, (200, 310), (320, 310), fill=(234, 88, 12), width=3)
    draw_arrow(draw, (480, 310), (580, 310), fill=(2, 132, 199), width=3)
    draw_arrow(draw, (780, 280), (860, 240), fill=(22, 163, 74), width=3)
    draw_arrow(draw, (780, 330), (860, 390), fill=(220, 38, 38), width=3)

    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    tmp_path = tmp.name
    tmp.close()
    img.save(tmp_path)
    return tmp_path

async def run_interpretation_evaluation():
    initialize_ocr()

    test_diagrams = [
        ("Simple Architecture Diagram", create_simple_architecture_diagram),
        ("Application Architecture Diagram", create_application_architecture_diagram),
        ("Network/Cloud Architecture Diagram", create_cloud_network_architecture_diagram)
    ]

    results = []

    print("\n" + "="*85)
    print("TEAM D: DIAGRAM INTERPRETATION EVALUATION (BEFORE vs AFTER)")
    print("="*85)

    for title, creator_fn in test_diagrams:
        print(f"\nEvaluating: {title}...")
        img_path = creator_fn()

        try:
            # 1. OCR Extraction (provides both text and developer bounding boxes)
            ocr_result = extract_text_from_file(img_path, os.path.basename(img_path))
            ocr_text = ocr_result.get("plain_text", "")
            ocr_json = ocr_result.get("detected_text", [])

            # 2. Run Mode A: BEFORE (OCR text only, no image)
            print("  Running BEFORE mode (OCR text only)...")
            analysis_before = await analyze_architecture_gemini(
                ocr_text=ocr_text,
                ocr_json=None,
                diagram_file_path=None
            )

            # 3. Run Mode B: AFTER (Visual diagram image + OCR text + OCR bounding boxes)
            print("  Running AFTER mode (Image + OCR text + Bounding Boxes)...")
            analysis_after = await analyze_architecture_gemini(
                ocr_text=ocr_text,
                ocr_json=ocr_json,
                diagram_file_path=img_path
            )

            # Extract evaluation metrics
            diag_analysis_after = analysis_after.get("diagram_analysis", {})
            relationships_after = analysis_after.get("architecture_relationships", [])
            components_after = analysis_after.get("components", [])

            # Summary comparison
            record = {
                "diagram_title": title,
                "diagram_type_detected": diag_analysis_after.get("diagram_type", "System Architecture"),
                "components_detected_after": len(components_after),
                "relationships_detected_after": len(relationships_after),
                "sample_relationships": relationships_after[:4],
                "before_has_relationships": len(analysis_before.get("architecture_relationships", [])) > 0,
                "after_has_relationships": len(relationships_after) > 0,
                "confidence": diag_analysis_after.get("confidence", "high"),
                "notes": diag_analysis_after.get("notes", [])
            }
            results.append(record)
            print(f"  [DONE] Type: {record['diagram_type_detected']} | Components: {record['components_detected_after']} | Relationships: {record['relationships_detected_after']}")

        except Exception as e:
            print(f"  [ERROR] Evaluation failed for {title}: {e}")
            results.append({
                "diagram_title": title,
                "error": str(e)
            })
        finally:
            if os.path.exists(img_path):
                os.remove(img_path)

    # Save to JSON
    out_file = os.path.join(BACKEND_DIR, "test_diagram_interpretation_results.json")
    with open(out_file, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nEvaluation results written to {out_file}")

if __name__ == "__main__":
    asyncio.run(run_interpretation_evaluation())
