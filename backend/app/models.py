from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    diagrams = relationship("Diagram", back_populates="owner", cascade="all, delete-orphan")


class Diagram(Base):
    __tablename__ = "diagrams"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    status = Column(String, default="uploaded", nullable=False)  # uploaded, ocr_processing, ocr_completed, llm_processing, completed, failed
    
    ocr_text = Column(Text, nullable=True)
    ocr_json = Column(JSON, nullable=True)  # Store developer OCR output
    analysis_json = Column(JSON, nullable=True) # Store the raw Gemini JSON analysis
    
    # Generated Architecture Documentation details
    architecture_summary = Column(Text, nullable=True)
    workflow_explanation = Column(Text, nullable=True)
    
    # Store structured JSON data
    tech_stack = Column(JSON, nullable=True)          # {"frontend": [], "backend": [], "database": [], "devops": []}
    components = Column(JSON, nullable=True)          # [{"name": "Auth Service", "description": "Handles authentication"}]
    suggested_apis = Column(JSON, nullable=True)      # [{"method": "POST", "path": "/login", "description": "Authenticates user"}]
    database_entities = Column(JSON, nullable=True)   # [{"name": "User", "columns": [{"name": "id", "type": "INT"}]}]
    
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    owner = relationship("User", back_populates="diagrams")
