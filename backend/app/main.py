import os
import sys

# Ensure the backend directory is in the Python search path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth, projects, diagrams, dashboard, ocr, analyze
from app.services.ocr import initialize_ocr

# Initialize database schemas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Diagram-to-Solution Engineering Platform API",
    description="Backend services for extracting architecture specifications from diagrams and generating engineering documentation.",
    version="2.0.0"
)

origins = [
    "http://localhost:5173",  # Vite Dev Server
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to load OCR model
@app.on_event("startup")
def startup_event():
    initialize_ocr()

# Attach routers - supporting both /api/auth and /auth paths
app.include_router(auth.router, prefix="/api/auth")
app.include_router(auth.router, prefix="/auth")

# Core domain routers
app.include_router(projects.router)
app.include_router(diagrams.router)
app.include_router(dashboard.router)
app.include_router(ocr.router)
app.include_router(analyze.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Diagram-to-Solution Engineering Platform Platform API",
        "version": "2.0.0",
        "database": "PostgreSQL",
        "documentation": "/docs"
    }
