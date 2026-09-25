from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Tuple
from app.services.shifter.types import ContextHandoff

class BaseLLMProvider(ABC):
    """
    Abstract Base Class for LLM Providers.
    """

    def __init__(self, provider_name: str, api_key: str):
        self.provider_name = provider_name.lower().strip()
        self.api_key = api_key

    @abstractmethod
    async def generate_analysis(self, model_name: str, context: ContextHandoff) -> Tuple[Dict[str, Any], str, Optional[Dict[str, int]]]:
        """
        Executes analysis with given model_name and context.

        Returns:
            Tuple[Dict[str, Any], str, Optional[Dict[str, int]]]: (parsed_json, raw_text, token_usage)
        """
        pass

    def build_prompt(self, context: ContextHandoff) -> str:
        """
        Constructs prompt incorporating system instructions, OCR text/JSON, completed stages, and handoff context.
        """
        prompt = (
            "You are a Senior Enterprise Solution Architect. You are analyzing OCR text and OCR developer JSON extracted from a software architecture diagram.\n"
            "You must understand the architecture and generate useful engineering analysis.\n\n"
            "RULES:\n"
            "1. Use detected OCR information as the primary source.\n"
            "2. Do not invent unrelated technologies.\n"
            "3. Technologies explicitly detected in OCR must be treated as detected technologies.\n"
            "4. Logical architecture components may be inferred when strongly supported by labels.\n"
            "5. Clearly distinguish detected architecture information from suggested engineering outputs.\n"
            "6. Workflow relationships may be logically inferred from OCR labels.\n"
            "7. Return valid JSON only. Do not return Markdown code fences.\n\n"
        )

        if context.completed_stages:
            prompt += f"COMPLETED PIPELINE STAGES: {', '.join(context.completed_stages)}\n\n"

        if context.intermediate_results:
            prompt += f"INTERMEDIATE STAGE DATA: {context.intermediate_results}\n\n"

        prompt += f"OCR Extracted Text:\n{context.ocr_text}\n\n"

        if context.ocr_json is not None:
            import json
            prompt += f"OCR Developer JSON Output:\n{json.dumps(context.ocr_json, indent=2)}\n\n"

        if context.switch_history:
            history_summary = "; ".join([f"{s.from_provider}/{s.from_model} -> {s.to_provider}/{s.to_model} ({s.reason.value})" for s in context.switch_history])
            prompt += f"EXECUTION HANDOFF NOTICE: Previous agent attempts encountered limits ({history_summary}). Please complete the task seamlessly.\n\n"

        prompt += (
            "You MUST return a JSON object adhering exactly to the following structure:\n"
            "{\n"
            '  "summary": {\n'
            '    "architecture_name": "string",\n'
            '    "architecture_type": "string",\n'
            '    "overview": "string"\n'
            '  },\n'
            '  "workflow": [\n'
            '    {\n'
            '      "step": 1,\n'
            '      "title": "string",\n'
            '      "description": "string"\n'
            '    }\n'
            '  ],\n'
            '  "tech_stack": [\n'
            '    {\n'
            '      "technology": "string",\n'
            '      "category": "string",\n'
            '      "purpose": "string"\n'
            '    }\n'
            '  ],\n'
            '  "components": [\n'
            '    {\n'
            '      "name": "string",\n'
            '      "type": "string",\n'
            '      "purpose": "string"\n'
            '    }\n'
            '  ],\n'
            '  "suggested_apis": [\n'
            '    {\n'
            '      "method": "GET | POST | PUT | PATCH | DELETE",\n'
            '      "endpoint": "string",\n'
            '      "purpose": "string"\n'
            '    }\n'
            '  ],\n'
            '  "database_schema": {\n'
            '    "required": true,\n'
            '    "reason": "string",\n'
            '    "entities": [\n'
            '      {\n'
            '        "name": "string",\n'
            '        "purpose": "string",\n'
            '        "suggested_fields": [\n'
            '          "field_name"\n'
            '        ]\n'
            '      }\n'
            '    ]\n'
            '  }\n'
            "}\n"
        )
        return prompt
