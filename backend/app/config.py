import os
import sys
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Ensure the backend directory is in the Python search path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Load env variables from backend/.env if present
load_dotenv(dotenv_path=os.path.join(BACKEND_DIR, ".env"))

# Configure absolute database path for local SQLite to ensure consistency
default_db_path = os.path.join(BACKEND_DIR, "diagram_to_solution.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{default_db_path}")

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretjwtkeyforlocaldevelopment123!")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(BACKEND_DIR, "uploads"))

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)
 