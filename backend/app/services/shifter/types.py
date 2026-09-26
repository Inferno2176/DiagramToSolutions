import os
from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Set, Tuple
from datetime import datetime, timezone

class ShiftReason(str, Enum):
    MODEL_TOKEN_EXHAUSTED = "MODEL_TOKEN_EXHAUSTED"
    MODEL_CONTEXT_LIMIT = "MODEL_CONTEXT_LIMIT"
    PROVIDER_QUOTA_EXHAUSTED = "PROVIDER_QUOTA_EXHAUSTED"
    RATE_LIMITED = "RATE_LIMITED"
    MODEL_OVERLOADED = "MODEL_OVERLOADED"
    TIMEOUT = "TIMEOUT"
    MODEL_UNAVAILABLE = "MODEL_UNAVAILABLE"
    AUTH_ERROR = "AUTH_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"

@dataclass
class ShiftLog:
    from_provider: str
    from_model: str
    to_provider: str
    to_model: str
    reason: ShiftReason
    latency_seconds: float
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "from_provider": self.from_provider,
            "from_model": self.from_model,
            "to_provider": self.to_provider,
            "to_model": self.to_model,
            "reason": self.reason.value if isinstance(self.reason, ShiftReason) else str(self.reason),
            "latency_seconds": round(self.latency_seconds, 2),
            "timestamp": self.timestamp
        }

@dataclass
class ContextHandoff:
    original_user_request: str
    ocr_text: str
    ocr_json: Optional[Any] = None
    diagram_file_path: Optional[str] = None
    completed_stages: List[str] = field(default_factory=lambda: ["ocr_completed"])
    intermediate_results: Dict[str, Any] = field(default_factory=dict)
    current_execution_state: str = "llm_processing"
    remaining_task: str = "Generate structured engineering architecture analysis"
    tool_results: Optional[Dict[str, Any]] = None
    switch_history: List[ShiftLog] = field(default_factory=list)
    attempted_models: Set[str] = field(default_factory=set)

    def get_diagram_image_bytes(self) -> Optional[Tuple[bytes, str]]:
        """
        Loads and returns (image_bytes, mime_type) for visual multimodal analysis.
        Supports PNG, JPG, JPEG, and renders the primary page of PDF documents.
        """
        if not self.diagram_file_path or not os.path.exists(self.diagram_file_path):
            return None
        
        ext = os.path.splitext(self.diagram_file_path)[1].lower()
        try:
            if ext == ".png":
                with open(self.diagram_file_path, "rb") as f:
                    return f.read(), "image/png"
            elif ext in (".jpg", ".jpeg"):
                with open(self.diagram_file_path, "rb") as f:
                    return f.read(), "image/jpeg"
            elif ext == ".pdf":
                import fitz
                doc = fitz.open(self.diagram_file_path)
                if len(doc) > 0:
                    pix = doc[0].get_pixmap(dpi=200)
                    png_bytes = pix.tobytes("png")
                    doc.close()
                    return png_bytes, "image/png"
                doc.close()
        except Exception:
            pass
        return None

    def mark_stage_completed(self, stage_name: str, stage_data: Optional[Dict[str, Any]] = None):
        if stage_name not in self.completed_stages:
            self.completed_stages.append(stage_name)
        if stage_data:
            self.intermediate_results[stage_name] = stage_data

    def record_attempt(self, provider: str, model: str):
        self.attempted_models.add(f"{provider.lower()}:{model.strip()}")

    def is_attempted(self, provider: str, model: str) -> bool:
        return f"{provider.lower()}:{model.strip()}" in self.attempted_models

@dataclass
class ExecutionResult:
    analysis_json: Dict[str, Any]
    raw_text: str
    provider: str
    model: str
    latency_seconds: float
    token_usage: Optional[Dict[str, int]] = None
    switch_history: List[ShiftLog] = field(default_factory=list)

    def get_metadata(self, initial_provider: str, initial_model: str) -> Dict[str, Any]:
        return {
            "initial_provider": initial_provider,
            "initial_model": initial_model,
            "final_provider": self.provider,
            "final_model": self.model,
            "switch_count": len(self.switch_history),
            "switch_history": [s.to_dict() for s in self.switch_history],
            "latency_seconds": round(self.latency_seconds, 2),
            "token_usage": self.token_usage or {}
        }

class NoFallbackAvailableError(Exception):
    """Raised when all configured models/providers fail or max switches reached."""
    def __init__(self, message: str, execution_metadata: Dict[str, Any]):
        super().__init__(message)
        self.execution_metadata = execution_metadata

class AuthenticationError(Exception):
    """Raised when an unrecoverable auth error occurs without alternative valid providers."""
    pass
