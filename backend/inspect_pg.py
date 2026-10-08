import os
import sys

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("==================================================")
    print("      ACTIVE POSTGRESQL DATABASE SUMMARY          ")
    print("==================================================")
    
    tables = [t[0] for t in conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")).fetchall()]
    print("\n--- TABLES & TOTAL RECORD COUNTS ---")
    for t in tables:
        count = conn.execute(text(f"SELECT count(*) FROM {t}")).scalar()
        print(f"  • {t:<22} : {count} rows")

    print("\n--- USERS (FIRST 8 USERS) ---")
    users = conn.execute(text("SELECT id, username, email, name, is_active FROM users ORDER BY id LIMIT 8")).fetchall()
    for u in users:
        print(f"  [User #{u[0]:<3}] Username: {u[1]:<25} | Email: {u[2]:<30} | Name: {u[3] or 'N/A'}")

    print("\n--- PROJECTS (RECENT 5) ---")
    projects = conn.execute(text("SELECT id, user_id, name, status, created_at FROM projects ORDER BY created_at DESC LIMIT 5")).fetchall()
    for p in projects:
        print(f"  [Project] ID: {p[0][:8]}... | User #{p[1]} | Name: {p[2]} | Status: {p[3]}")

    print("\n--- INPUT DIAGRAM UPLOADS (RECENT 5) ---")
    uploads = conn.execute(text("SELECT id, project_id, user_id, original_filename, processing_status, file_type FROM diagram_uploads ORDER BY uploaded_at DESC LIMIT 5")).fetchall()
    for up in uploads:
        print(f"  [Diagram] ID: {up[0][:8]}... | User #{up[2]} | File: {up[3]:<30} | Status: {up[4]}")

    print("\n--- OCR RESULTS (RECENT 5) ---")
    ocrs = conn.execute(text("SELECT id, diagram_upload_id, total_detections, pages_processed, status FROM ocr_results ORDER BY created_at DESC LIMIT 5")).fetchall()
    for o in ocrs:
        print(f"  [OCR]     ID: {o[0][:8]}... | Diagram: {o[1][:8]}... | Detections: {o[2]} | Pages: {o[3]} | Status: {o[4]}")

    print("\n--- AI-GENERATED SOLUTIONS / ANALYSIS (RECENT 5) ---")
    analyses = conn.execute(text("SELECT id, diagram_upload_id, architecture_name, architecture_type, model_name, analysis_status FROM analysis_results ORDER BY created_at DESC LIMIT 5")).fetchall()
    for a in analyses:
        print(f"  [Solution] ID: {a[0][:8]}... | Architecture: {a[2]:<30} | Type: {a[3] or 'N/A'} | Model: {a[4]}")
    print("==================================================")
