import os
import sys

# Ensure backend directory is in sys.path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import text
from app.config import DATABASE_URL
from app.database import engine, SessionLocal
from app.models import Base

def test_connection():
    print(f"Connecting to database via URL: {DATABASE_URL.split('@')[-1]}")
    try:
        # 1. Test raw connectivity via engine
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();")).fetchone()
            print(f"PostgreSQL connection successful! DB version: {result[0]}")
            
        # 2. Test sessionmaker and transaction
        db = SessionLocal()
        try:
            one = db.execute(text("SELECT 1;")).scalar()
            assert one == 1
            print("SQLAlchemy SessionLocal operational.")
        finally:
            db.close()
            
        # 3. Create tables using Base.metadata.create_all
        print("Creating tables in PostgreSQL (if not exists)...")
        Base.metadata.create_all(bind=engine)
        print("Schema tables (users, diagrams) created successfully.")
        
        # 4. Verify tables exist in PostgreSQL information_schema
        with engine.connect() as conn:
            tables = conn.execute(
                text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
            ).fetchall()
            table_names = [t[0] for t in tables]
            print(f"Tables in public schema: {table_names}")
            assert "users" in table_names, "users table missing"
            assert "diagrams" in table_names, "diagrams table missing"
            print("Table existence verification PASSED.")
            
        return True
    except Exception as e:
        print(f"Connection test FAILED: {e}")
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
