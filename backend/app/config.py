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

# --- Agent Model Shifter Configuration ---
MAX_MODEL_SWITCHES = int(os.getenv("MAX_MODEL_SWITCHES", "5"))
MODEL_REQUEST_TIMEOUT_SECONDS = float(os.getenv("MODEL_REQUEST_TIMEOUT_SECONDS", "30.0"))

LLM_PROVIDER_CHAIN = [p.strip().lower() for p in os.getenv("LLM_PROVIDER_CHAIN", "gemini,grok,openai").split(",") if p.strip()]

GEMINI_MODEL_CHAIN = [m.strip() for m in os.getenv("GEMINI_MODEL_CHAIN", "gemini-3.5-flash,gemini-3.8-flash,gemini-3.6-flash,gemini-3.1-pro-preview").split(",") if m.strip()]
GROK_MODEL_CHAIN = [m.strip() for m in os.getenv("GROK_MODEL_CHAIN", "grok-2-latest,grok-beta").split(",") if m.strip()]
OPENAI_MODEL_CHAIN = [m.strip() for m in os.getenv("OPENAI_MODEL_CHAIN", "gpt-4o,gpt-4o-mini").split(",") if m.strip()]

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROK_API_KEY = os.getenv("GROK_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")