import os
import sys
import uuid
from datetime import datetime, timezone

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import text
from app.database import engine, SessionLocal
from app.models import Base, User, Project, DiagramUpload, OcrResult, AnalysisResult, Diagram

def upgrade_and_migrate():
    print("=== Starting Schema Upgrade and Data Organization ===")
    
    # 1. Update users table columns if needed
    with engine.connect() as conn:
        cols = [c[0] for c in conn.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name='users'")
        ).fetchall()]
        
        print(f"Current columns in users: {cols}")
        
        if "name" not in cols:
            print("Adding 'name' column to users...")
            conn.execute(text("ALTER TABLE users ADD COLUMN name VARCHAR(255);"))
            conn.execute(text("UPDATE users SET name = username WHERE name IS NULL;"))
            
        if "password_hash" not in cols:
            print("Adding 'password_hash' column to users...")
            conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);"))
            if "hashed_password" in cols:
                conn.execute(text("UPDATE users SET password_hash = hashed_password WHERE password_hash IS NULL;"))
                
        if "is_active" not in cols:
            print("Adding 'is_active' column to users...")
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;"))
            
        if "updated_at" not in cols:
            print("Adding 'updated_at' column to users...")
            conn.execute(text("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();"))
            
        if "email" not in cols:
            print("Adding 'email' column to users...")
            conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(255);"))
            # Generate clean normalized emails for existing users
            existing_users = conn.execute(text("SELECT id, username FROM users")).fetchall()
            for u_id, u_name in existing_users:
                if "@" in u_name:
                    u_email = u_name.strip().lower()
                else:
                    u_email = f"{u_name.strip().lower()}@local.dev"
                conn.execute(
                    text("UPDATE users SET email = :email WHERE id = :id"),
                    {"email": u_email, "id": u_id}
                )
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);"))
            
        conn.commit()
        print("Users table successfully upgraded.")

    # 2. Create new tables (projects, diagram_uploads, ocr_results, analysis_results)
    print("Creating new relational tables if not exists...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")
    
    # 3. Migrate existing diagrams into the new multi-tier hierarchy
    db = SessionLocal()
    try:
        legacy_diagrams = db.query(Diagram).all()
        print(f"Total legacy diagrams found: {len(legacy_diagrams)}")
        
        migrated_uploads = 0
        for d in legacy_diagrams:
            # Check if DiagramUpload already exists with this ID
            existing_upload = db.query(DiagramUpload).filter(DiagramUpload.id == d.id).first()
            if existing_upload:
                continue
                
            # 3a. Find or create a Project for this user and diagram
            proj_name = os.path.splitext(d.filename)[0].replace("_", " ").title()
            project = db.query(Project).filter(
                Project.user_id == d.user_id,
                Project.name == proj_name
            ).first()
            
            if not project:
                project = Project(
                    id=str(uuid.uuid4()),
                    user_id=d.user_id,
                    name=proj_name,
                    description=f"Architecture project generated from {d.filename}",
                    status="active",
                    created_at=d.created_at,
                    updated_at=d.completed_at or d.created_at
                )
                db.add(project)
                db.flush()
                
            # 3b. Create DiagramUpload preserving the exact diagram ID
            file_ext = os.path.splitext(d.filename)[1].lower() or ".png"
            mime_type = "application/pdf" if file_ext == ".pdf" else f"image/{file_ext.lstrip('.')}"
            file_size = None
            if os.path.exists(d.file_path):
                file_size = os.path.getsize(d.file_path)
                
            upload = DiagramUpload(
                id=d.id,
                project_id=project.id,
                user_id=d.user_id,
                original_filename=d.filename,
                stored_filename=os.path.basename(d.file_path),
                file_type=file_ext,
                mime_type=mime_type,
                file_size=file_size,
                storage_path=d.file_path,
                processing_status=d.status,
                uploaded_at=d.created_at,
                updated_at=d.completed_at or d.created_at
            )
            db.add(upload)
            db.flush()
            
            # 3c. Create OcrResult if OCR text or json exists
            if d.ocr_text or d.ocr_json:
                ocr_detections = 0
                pages = 1
                if isinstance(d.ocr_json, dict):
                    ocr_detections = d.ocr_json.get("total_detections", len(d.ocr_json.get("detected_text", [])))
                    pages = d.ocr_json.get("pages_processed", 1)
                    
                ocr_record = OcrResult(
                    id=str(uuid.uuid4()),
                    diagram_upload_id=upload.id,
                    ocr_text=d.ocr_text,
                    ocr_json=d.ocr_json,
                    confidence=0.95,
                    total_detections=ocr_detections,
                    pages_processed=pages,
                    status="completed" if d.ocr_text else "pending",
                    created_at=d.created_at,
                    updated_at=d.completed_at or d.created_at
                )
                db.add(ocr_record)
                
            # 3d. Create AnalysisResult if AI solution exists
            if d.analysis_json or d.architecture_summary or d.workflow_explanation:
                arch_name = None
                arch_type = None
                workflow_json = None
                arch_rel = None
                diag_analysis = None
                
                if isinstance(d.analysis_json, dict):
                    summary_obj = d.analysis_json.get("summary", {})
                    arch_name = summary_obj.get("architecture_name") or d.filename
                    arch_type = summary_obj.get("architecture_type")
                    workflow_json = d.analysis_json.get("workflow")
                    arch_rel = d.analysis_json.get("architecture_relationships")
                    diag_analysis = d.analysis_json.get("diagram_analysis")
                    
                analysis_record = AnalysisResult(
                    id=str(uuid.uuid4()),
                    diagram_upload_id=upload.id,
                    architecture_name=arch_name or d.filename,
                    architecture_type=arch_type or "General Architecture",
                    summary=d.architecture_summary,
                    workflow=workflow_json,
                    workflow_explanation=d.workflow_explanation,
                    tech_stack=d.tech_stack,
                    components=d.components,
                    suggested_apis=d.suggested_apis,
                    database_schema=d.database_entities,
                    architecture_relationships=arch_rel,
                    diagram_analysis=diag_analysis,
                    raw_analysis_json=d.analysis_json,
                    model_name="gemini",
                    analysis_status=d.status,
                    created_at=d.created_at,
                    completed_at=d.completed_at,
                    updated_at=d.completed_at or d.created_at
                )
                db.add(analysis_record)
                
            migrated_uploads += 1
            
        db.commit()
        print(f"Successfully migrated {migrated_uploads} diagrams into projects, uploads, OCR, and AI results.")
        
        # 4. Summary counts
        p_count = db.query(Project).count()
        u_count = db.query(DiagramUpload).count()
        ocr_count = db.query(OcrResult).count()
        a_count = db.query(AnalysisResult).count()
        user_count = db.query(User).count()
        print(f"Final Counts: Users={user_count}, Projects={p_count}, DiagramUploads={u_count}, OcrResults={ocr_count}, AnalysisResults={a_count}")
        print("=== Schema Upgrade and Migration COMPLETE ===")
        
    except Exception as e:
        db.rollback()
        print(f"Migration error: {e}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    upgrade_and_migrate()
