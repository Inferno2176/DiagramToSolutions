import os
import sys
import json
import shutil
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

# Ensure backend directory is in sys.path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import create_engine, text, select
from sqlalchemy.orm import sessionmaker

from app.config import DATABASE_URL as TARGET_DATABASE_URL
from app.models import Base, User, Diagram

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migration")

SQLITE_DB_PATH = os.path.join(BACKEND_DIR, "diagram_to_solution.db")
SQLITE_BACKUP_PATH = os.path.join(BACKEND_DIR, "diagram_to_solution.db.bak")

def json_equal(obj1: Any, obj2: Any) -> bool:
    """
    Compares two JSON structures by parsing and serializing with sorted keys.
    """
    if obj1 is None and obj2 is None:
        return True
    if obj1 is None or obj2 is None:
        return False
    try:
        s1 = json.dumps(obj1, sort_keys=True)
        s2 = json.dumps(obj2, sort_keys=True)
        return s1 == s2
    except Exception:
        return obj1 == obj2

def execute_migration():
    logger.info("=== Starting SQLite to PostgreSQL Migration ===")
    
    # STEP 1: Preflight - Verify SQLite Database
    if not os.path.exists(SQLITE_DB_PATH):
        logger.error(f"Preflight Failed: Source SQLite database not found at '{SQLITE_DB_PATH}'")
        sys.exit(1)
        
    logger.info(f"[Preflight 1/4] Source SQLite database verified: {SQLITE_DB_PATH}")

    # STEP 2: Backup SQLite Database
    try:
        shutil.copy2(SQLITE_DB_PATH, SQLITE_BACKUP_PATH)
        logger.info(f"[Preflight 2/4] SQLite safety backup created: {SQLITE_BACKUP_PATH}")
    except Exception as e:
        logger.error(f"Preflight Failed: Unable to create SQLite backup: {e}")
        sys.exit(1)

    # STEP 3: Connect to SQLite Source
    sqlite_url = f"sqlite:///{SQLITE_DB_PATH}"
    sqlite_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    SQLiteSession = sessionmaker(bind=sqlite_engine)
    sqlite_session = SQLiteSession()

    sqlite_users = sqlite_session.query(User).all()
    sqlite_diagrams = sqlite_session.query(Diagram).all()

    logger.info(f"[Preflight 3/4] SQLite Source Counts - Users: {len(sqlite_users)}, Diagrams: {len(sqlite_diagrams)}")

    # STEP 4: Target PostgreSQL Connection Check
    postgres_url = TARGET_DATABASE_URL
    if not postgres_url.startswith("postgresql"):
        # Check if environment variable POSTGRES_DATABASE_URL exists or prompt
        env_pg = os.getenv("POSTGRES_DATABASE_URL")
        if env_pg and env_pg.startswith("postgresql"):
            postgres_url = env_pg
        else:
            logger.error("Preflight Failed: TARGET_DATABASE_URL is not a PostgreSQL connection string.")
            logger.error("Please set DATABASE_URL=postgresql://user:password@host:5432/dbname in .env or environment.")
            sys.exit(1)

    try:
        postgres_engine = create_engine(postgres_url)
        with postgres_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info(f"[Preflight 4/4] PostgreSQL connection verified: {postgres_url.split('@')[-1]}")
    except Exception as e:
        logger.error(f"Preflight Failed: Cannot connect to PostgreSQL at '{postgres_url}': {e}")
        logger.error("Make sure PostgreSQL is running (e.g. 'docker compose up -d postgres').")
        sys.exit(1)

    logger.info("All preflight checks PASSED cleanly. Proceeding to transactional migration...")

    # STEP 5: Migration inside a single PostgreSQL Transaction
    PostgresSession = sessionmaker(bind=postgres_engine)
    pg_session = PostgresSession()

    try:
        # Create schema on PostgreSQL if not exists
        Base.metadata.create_all(bind=postgres_engine)

        # Clear target tables for idempotency / clean re-runs
        pg_session.query(Diagram).delete()
        pg_session.query(User).delete()
        pg_session.flush()

        # Migrate Users
        for u in sqlite_users:
            new_user = User(
                id=u.id,
                username=u.username,
                hashed_password=u.hashed_password,
                created_at=u.created_at
            )
            pg_session.add(new_user)
        pg_session.flush()

        # Migrate Diagrams
        for d in sqlite_diagrams:
            new_diagram = Diagram(
                id=d.id,
                user_id=d.user_id,
                filename=d.filename,
                file_path=d.file_path,
                status=d.status,
                ocr_text=d.ocr_text,
                ocr_json=d.ocr_json,
                analysis_json=d.analysis_json,
                architecture_summary=d.architecture_summary,
                workflow_explanation=d.workflow_explanation,
                tech_stack=d.tech_stack,
                components=d.components,
                suggested_apis=d.suggested_apis,
                database_entities=d.database_entities,
                created_at=d.created_at,
                completed_at=d.completed_at
            )
            pg_session.add(new_diagram)
        pg_session.flush()

        # STEP 6: Synchronize PostgreSQL Primary Key Sequences
        pg_session.execute(text("SELECT setval(pg_get_serial_sequence('users', 'id'), coalesce(max(id), 1)) FROM users;"))
        logger.info("PostgreSQL primary key sequence 'users_id_seq' synchronized.")

        # STEP 7: Comprehensive Validation Before Commit
        pg_users = pg_session.query(User).all()
        pg_diagrams = pg_session.query(Diagram).all()

        user_count_pass = len(sqlite_users) == len(pg_users)
        diagram_count_pass = len(sqlite_diagrams) == len(pg_diagrams)

        if not user_count_pass or not diagram_count_pass:
            raise ValueError(f"Row count mismatch! Users ({len(sqlite_users)} vs {len(pg_users)}), Diagrams ({len(sqlite_diagrams)} vs {len(pg_diagrams)})")

        # Validate JSON and Relationship Integrity
        pg_user_dict = {u.id: u for u in pg_users}
        for u in sqlite_users:
            pg_u = pg_user_dict.get(u.id)
            if not pg_u or pg_u.username != u.username or pg_u.hashed_password != u.hashed_password:
                raise ValueError(f"User validation failed for user ID {u.id}")

        pg_diagram_dict = {d.id: d for d in pg_diagrams}
        for d in sqlite_diagrams:
            pg_d = pg_diagram_dict.get(d.id)
            if not pg_d:
                raise ValueError(f"Diagram missing in PostgreSQL for ID {d.id}")

            if pg_d.user_id != d.user_id or pg_d.filename != d.filename or pg_d.status != d.status:
                raise ValueError(f"Scalar field mismatch for diagram ID {d.id}")

            if not json_equal(d.ocr_json, pg_d.ocr_json):
                raise ValueError(f"JSON validation failed for ocr_json on diagram ID {d.id}")

            if not json_equal(d.analysis_json, pg_d.analysis_json):
                raise ValueError(f"JSON validation failed for analysis_json on diagram ID {d.id}")

        # Commit Transaction
        pg_session.commit()
        logger.info("Transaction COMMITTED successfully.")

        # Print Final Summary Report
        print("\n==========================================")
        print("     POSTGRESQL MIGRATION SUMMARY REPORT   ")
        print("==========================================")
        print(f"Users:")
        print(f"  SQLite:     {len(sqlite_users)}")
        print(f"  PostgreSQL: {len(pg_users)}")
        print(f"  Status:     PASS")
        print(f"\nDiagrams:")
        print(f"  SQLite:     {len(sqlite_diagrams)}")
        print(f"  PostgreSQL: {len(pg_diagrams)}")
        print(f"  Status:     PASS")
        print(f"\nData Integrity & JSON Structure Validation:")
        print(f"  Status:     PASS")
        print(f"\nSQLite Safety Backup preserved at:")
        print(f"  {SQLITE_BACKUP_PATH}")
        print("==========================================\n")

    except Exception as exc:
        pg_session.rollback()
        logger.error(f"Migration Failed! Transaction ROLLED BACK completely: {exc}")
        sys.exit(1)
    finally:
        sqlite_session.close()
        pg_session.close()

if __name__ == "__main__":
    execute_migration()
