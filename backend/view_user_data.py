import os
import sys
import json

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database import engine
from sqlalchemy import text

def inspect_user(target_username="testuser11"):
    with engine.connect() as conn:
        u = conn.execute(
            text("SELECT id, username, email, name, created_at FROM users WHERE username = :u"),
            {"u": target_username}
        ).fetchone()
        
        if not u:
            print(f"User '{target_username}' was not found in the database.")
            return

        user_id = u[0]
        print("==================================================================")
        print(f" USER PROFILE: {u[1]} (ID: {user_id})")
        print(f" Email: {u[2]} | Name: {u[3]} | Registered: {u[4]}")
        print("==================================================================")

        # 1. Projects
        projects = conn.execute(
            text("SELECT id, name, description, status, created_at FROM projects WHERE user_id = :uid ORDER BY created_at DESC"),
            {"uid": user_id}
        ).fetchall()
        print(f"\n[PROJECTS] ({len(projects)} total):")
        for p in projects:
            print(f"  * [{p[0][:8]}...] {p[1]} | Status: {p[2]} | Created: {p[4]}")

        # 2. Uploads (Inputs)
        uploads = conn.execute(
            text("""
                SELECT id, project_id, original_filename, stored_filename, file_type, 
                       file_size, processing_status, uploaded_at, storage_path 
                FROM diagram_uploads 
                WHERE user_id = :uid 
                ORDER BY uploaded_at DESC
            """),
            {"uid": user_id}
        ).fetchall()
        
        print(f"\n[INPUT DIAGRAMS] ({len(uploads)} total):")
        if not uploads:
            print("  (No diagrams uploaded by this user yet.)")
            return

        for idx, up in enumerate(uploads, 1):
            upload_id = up[0]
            print(f"\n  ----------------------------------------------------------------")
            print(f"  #{idx} DIAGRAM UPLOAD: {up[2]}")
            print(f"     Upload ID:   {upload_id}")
            print(f"     Status:      {up[6]}")
            print(f"     Format:      {up[4]} (Size: {up[5]} bytes)")
            print(f"     File Path:   {up[8]}")
            print(f"     Uploaded At: {up[7]}")

            # 3. OCR Result
            ocr = conn.execute(
                text("""
                    SELECT id, total_detections, pages_processed, status, ocr_text, ocr_json 
                    FROM ocr_results 
                    WHERE diagram_upload_id = :uid
                """),
                {"uid": upload_id}
            ).fetchone()

            if ocr:
                print(f"\n     [OCR DATA] (Stored):")
                print(f"        * OCR ID:          {ocr[0]}")
                print(f"        * OCR Status:      {ocr[3]}")
                print(f"        * Detections:      {ocr[1]} labels across {ocr[2]} page(s)")
                text_preview = (ocr[4][:200] + "...") if ocr[4] and len(ocr[4]) > 200 else (ocr[4] or "None")
                print(f"        * Extracted Text Preview:")
                for line in text_preview.strip().splitlines()[:5]:
                    print(f"            {line}")
            else:
                print(f"     [OCR DATA]: Not yet generated / None")

            # 4. AI-Generated Solution
            analysis = conn.execute(
                text("""
                    SELECT id, architecture_name, architecture_type, model_name, 
                           analysis_status, summary, workflow_explanation, tech_stack, 
                           components, suggested_apis, database_schema, completed_at
                    FROM analysis_results 
                    WHERE diagram_upload_id = :uid
                """),
                {"uid": upload_id}
            ).fetchone()

            if analysis:
                print(f"\n     [AI-GENERATED SOLUTION] (Stored):")
                print(f"        * Solution ID:     {analysis[0]}")
                print(f"        * Architecture:    {analysis[1]}")
                print(f"        * Category:        {analysis[2]}")
                print(f"        * Model:           {analysis[3]} | Status: {analysis[4]}")
                print(f"        * Completed At:    {analysis[11]}")
                print(f"        * Architecture Summary:")
                summary_text = (analysis[5][:250] + "...") if analysis[5] and len(analysis[5]) > 250 else (analysis[5] or "None")
                print(f"            \"{summary_text.strip()}\"")
                
                if analysis[7]:
                    print(f"        * Tech Stack:")
                    if isinstance(analysis[7], dict):
                        for k, v in analysis[7].items():
                            val = ", ".join(v) if isinstance(v, list) else str(v)
                            print(f"            - {k.capitalize()}: {val}")
                    elif isinstance(analysis[7], list):
                        print(f"            - {analysis[7]}")

                if analysis[8] and isinstance(analysis[8], list):
                    print(f"        * Components Count: {len(analysis[8])}")
                if analysis[9] and isinstance(analysis[9], list):
                    print(f"        * Suggested APIs:   {len(analysis[9])}")
                if analysis[10] and isinstance(analysis[10], list):
                    print(f"        * Database Schema:  {len(analysis[10])} entities")
            else:
                print(f"     [AI-GENERATED SOLUTION]: Not yet completed / None")
                
        print("\n==================================================================")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "testuser11"
    inspect_user(target)
