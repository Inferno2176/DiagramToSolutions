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

# Configure database connection (PostgreSQL with psycopg3 driver by default)
DB_USER = os.getenv("POSTGRES_USER", "diagram_user")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "diagram_local_dev_secret")
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "diagram_solution")

DEFAULT_POSTGRES_URL = f"postgresql+psycopg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_POSTGRES_URL)

# Normalize postgresql:// to postgresql+psycopg:// for psycopg3 compatibility if specified without driver
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("sqlite:///") and not DATABASE_URL.startswith("sqlite:////"):
    rel_path = DATABASE_URL[len("sqlite:///"):]
    if not os.path.isabs(rel_path):
        DATABASE_URL = f"sqlite:///{os.path.join(BACKEND_DIR, rel_path).replace(os.sep, '/')}"

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretjwtkeyforlocaldevelopment123!")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(BACKEND_DIR, "uploads"))

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- Frontend & Password Reset Configuration ---
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = int(os.getenv("PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", "20"))

# --- Email / SMTP Configuration ---
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@diagramtosolutions.com")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "DiagramToSolutions Security")
SMTP_TLS = os.getenv("SMTP_TLS", "true").lower() in ("true", "1", "yes")
SMTP_SSL = os.getenv("SMTP_SSL", "false").lower() in ("true", "1", "yes")
EMAIL_DEV_MODE = os.getenv("EMAIL_DEV_MODE", "true").lower() in ("true", "1", "yes")

# --- Agent Model Shifter Configuration ---
MAX_MODEL_SWITCHES = int(os.getenv("MAX_MODEL_SWITCHES", "5"))
MODEL_REQUEST_TIMEOUT_SECONDS = float(os.getenv("MODEL_REQUEST_TIMEOUT_SECONDS", "30.0"))

LLM_PROVIDER_CHAIN = [p.strip().lower() for p in os.getenv("LLM_PROVIDER_CHAIN", "gemini,grok,openai").split(",") if p.strip()]

GEMINI_MODEL_CHAIN = [m.strip() for m in os.getenv("GEMINI_MODEL_CHAIN", "gemini-3.6-flash,gemini-3.8-flash,gemini-3.5-flash").split(",") if m.strip()]
GROK_MODEL_CHAIN = [m.strip() for m in os.getenv("GROK_MODEL_CHAIN", "grok-2-latest,grok-beta").split(",") if m.strip()]
OPENAI_MODEL_CHAIN = [m.strip() for m in os.getenv("OPENAI_MODEL_CHAIN", "gpt-4o,gpt-4o-mini").split(",") if m.strip()]

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROK_API_KEY = os.getenv("GROK_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")