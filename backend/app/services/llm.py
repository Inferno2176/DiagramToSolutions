import os
import json
import re
import asyncio
import logging
from typing import Dict, Any, Union, Optional

from app.services.shifter import (
    AgentModelShifter,
    ContextHandoff,
    NoFallbackAvailableError,
    AuthenticationError
)

logger = logging.getLogger("llm_service")

class GeminiQuotaExceededError(RuntimeError):
    """Exception raised when all LLM model/provider fallbacks are exhausted."""
    pass

def clean_json_response(text: str) -> str:
    """
    Cleans markdown JSON code blocks from raw response text.
    """
    text = text.strip()
    match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL | re.IGNORECASE)
    if match:
        text = match.group(1).strip()
    return text

async def analyze_architecture_gemini(
    ocr_text: str,
    ocr_json: Optional[Union[Dict[str, Any], list]] = None,
    initial_provider: Optional[str] = None,
    initial_model: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze OCR text and OCR developer JSON using the AgentModelShifter orchestration layer.
    Automatically handles two-level model and provider switching upon token exhaustion, timeouts, or quota limits.
    """
    if not ocr_text or not ocr_text.strip():
        raise ValueError("OCR extracted text is empty")

    context = ContextHandoff(
        original_user_request="Analyze software architecture diagram and extract engineering specifications",
        ocr_text=ocr_text,
        ocr_json=ocr_json,
        completed_stages=["ocr_completed"]
    )

    shifter = AgentModelShifter()

    try:
        execution_result = await shifter.execute_task(
            context=context,
            initial_provider=initial_provider,
            initial_model=initial_model
        )

        analysis = execution_result.analysis_json

        # Validate required JSON keys
        required_keys = ["summary", "workflow", "tech_stack", "components", "suggested_apis", "database_schema"]
        for key in required_keys:
            if key not in analysis:
                raise ValueError(f"Missing required key '{key}' in LLM response.")

        # Attach execution metadata to analysis payload
        analysis["model_execution_info"] = execution_result.get_metadata(
            initial_provider=initial_provider or shifter.provider_manager.provider_chain[0],
            initial_model=initial_model or shifter.provider_manager.provider_models.get(shifter.provider_manager.provider_chain[0], [""])[0]
        )

        return analysis

    except NoFallbackAvailableError as exc:
        logger.error(f"AgentModelShifter fallback exhausted: {exc}")
        raise GeminiQuotaExceededError(str(exc)) from exc
    except AuthenticationError as exc:
        logger.error(f"AgentModelShifter authentication error: {exc}")
        raise ValueError(str(exc)) from exc
    except Exception as exc:
        logger.error(f"LLM analysis execution error: {exc}")
        raise exc
