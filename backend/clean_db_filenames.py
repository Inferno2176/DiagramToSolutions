import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Diagram

def run_migration():
    db = SessionLocal()
    try:
        updated_count = 0
        
        # 1. Update d794b73d-aa9f-4ab2-a80c-9db1e04d1693.png -> Simple OCR Web Project Architecture.png
        diagrams_ocr = db.query(Diagram).filter(Diagram.filename == "d794b73d-aa9f-4ab2-a80c-9db1e04d1693.png").all()
        for d in diagrams_ocr:
            d.filename = "Simple OCR Web Project Architecture.png"
            updated_count += 1
            
        # 2. Update 039d5e00-fe7c-4e0e-8c81-4c457a7acb73.png -> E-Commerce Architecture Diagram.png
        diagrams_ecommerce = db.query(Diagram).filter(Diagram.filename == "039d5e00-fe7c-4e0e-8c81-4c457a7acb73.png").all()
        for d in diagrams_ecommerce:
            d.filename = "E-Commerce Architecture Diagram.png"
            updated_count += 1
            
        db.commit()
        print(f"Successfully cleaned up {updated_count} diagram filename records.")
        
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
