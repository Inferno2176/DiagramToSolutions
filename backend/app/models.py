from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base

# Optimize JSON storage to use native JSONB on PostgreSQL while maintaining standard JSON compatibility
JsonType = JSON().with_variant(JSONB, "postgresql")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    diagram_uploads = relationship("DiagramUpload", back_populates="owner", cascade="all, delete-orphan")
    diagrams = relationship("Diagram", back_populates="owner", cascade="all, delete-orphan")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_used = Column(Boolean, default=False, nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)

    # Relationships
    user = relationship("User", back_populates="password_reset_tokens")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    owner = relationship("User", back_populates="projects")
    diagram_uploads = relationship("DiagramUpload", back_populates="project", cascade="all, delete-orphan")


class DiagramUpload(Base):
    __tablename__ = "diagram_uploads"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    mime_type = Column(String(100), nullable=True)
    file_size = Column(Integer, nullable=True)
    storage_path = Column(String(500), nullable=False)
    processing_status = Column(String(50), default="uploaded", nullable=False)  # uploaded, ocr_processing, ocr_completed, llm_processing, completed, failed
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    project = relationship("Project", back_populates="diagram_uploads")
    owner = relationship("User", back_populates="diagram_uploads")
    ocr_result = relationship("OcrResult", back_populates="diagram_upload", uselist=False, cascade="all, delete-orphan")
    analysis_result = relationship("AnalysisResult", back_populates="diagram_upload", uselist=False, cascade="all, delete-orphan")


class OcrResult(Base):
    __tablename__ = "ocr_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    diagram_upload_id = Column(String(36), ForeignKey("diagram_uploads.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    ocr_text = Column(Text, nullable=True)
    ocr_json = Column(JsonType, nullable=True)
    confidence = Column(Float, nullable=True)
    total_detections = Column(Integer, default=0)
    pages_processed = Column(Integer, default=1)
    status = Column(String(50), default="completed", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    diagram_upload = relationship("DiagramUpload", back_populates="ocr_result")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    diagram_upload_id = Column(String(36), ForeignKey("diagram_uploads.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    architecture_name = Column(String(255), nullable=True)
    architecture_type = Column(String(100), nullable=True)
    summary = Column(Text, nullable=True)
    workflow = Column(JsonType, nullable=True)
    workflow_explanation = Column(Text, nullable=True)
    tech_stack = Column(JsonType, nullable=True)
    components = Column(JsonType, nullable=True)
    suggested_apis = Column(JsonType, nullable=True)
    database_schema = Column(JsonType, nullable=True)
    architecture_relationships = Column(JsonType, nullable=True)
    diagram_analysis = Column(JsonType, nullable=True)
    raw_analysis_json = Column(JsonType, nullable=True)
    model_name = Column(String(100), default="gemini", nullable=True)
    analysis_status = Column(String(50), default="completed", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    diagram_upload = relationship("DiagramUpload", back_populates="analysis_result")


# Legacy Diagram model maintained for full backwards compatibility
class Diagram(Base):
    __tablename__ = "diagrams"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    status = Column(String, default="uploaded", nullable=False)
    
    ocr_text = Column(Text, nullable=True)
    ocr_json = Column(JsonType, nullable=True)
    analysis_json = Column(JsonType, nullable=True)
    
    architecture_summary = Column(Text, nullable=True)
    workflow_explanation = Column(Text, nullable=True)
    
    tech_stack = Column(JsonType, nullable=True)
    components = Column(JsonType, nullable=True)
    suggested_apis = Column(JsonType, nullable=True)
    database_entities = Column(JsonType, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    owner = relationship("User", back_populates="diagrams")
