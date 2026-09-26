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
        Constructs prompt incorporating system instructions, OCR text/JSON, diagram visual context,
        spatial relationships, diagram classification, and architecture relationships.
        """
        prompt = (
            "You are a Senior Enterprise Solution Architect performing visual and structural architecture interpretation.\n"
            "You are analyzing the architecture diagram combining: (1) the visual diagram image, (2) OCR extracted text, and (3) OCR developer bounding-box coordinates.\n\n"
            "ACCURACY & INTERPRETATION RULES:\n"
            "1. Combine visual diagram image observation with OCR extracted text and spatial bounding boxes.\n"
            "2. Identify visible arrows, connectors, flow lines, containers, and groupings to understand relationships and data flow direction.\n"
            "3. Do NOT assume a relationship exists simply because two components appear near each other. Use visible arrows, lines, labels, and diagram semantics.\n"
            "4. If a relationship cannot be confidently determined, mark confidence as 'low' or omit rather than inventing one.\n"
            "5. Clearly separate DETECTED INFORMATION from AI RECOMMENDATIONS. Never invent components or technologies unless visually or textually verified in the diagram.\n"
            "6. Classify diagram type (e.g. System Architecture, Application Architecture, Network Architecture, Cloud Architecture, Data Flow Diagram, Process Flowchart, UML, Sequence Diagram, Entity Relationship Diagram, Deployment Diagram, Agentic AI Architecture, or Other).\n"
            "7. Return valid JSON only. Do not wrap in Markdown code fences.\n\n"
        )

        if context.completed_stages:
            prompt += f"COMPLETED PIPELINE STAGES: {', '.join(context.completed_stages)}\n\n"

        if context.intermediate_results:
            prompt += f"INTERMEDIATE STAGE DATA: {context.intermediate_results}\n\n"

        prompt += f"OCR Extracted Text:\n{context.ocr_text}\n\n"

        if context.ocr_json is not None:
            import json
            prompt += f"OCR Developer JSON (Bounding Boxes & Detections):\n{json.dumps(context.ocr_json, indent=2)}\n\n"

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
            '  "diagram_analysis": {\n'
            '    "diagram_type": "string",\n'
            '    "components_detected": 0,\n'
            '    "relationships_detected": 0,\n'
            '    "confidence": "high | medium | low",\n'
            '    "notes": [\n'
            '      "string"\n'
            '    ]\n'
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
            '      "purpose": "string",\n'
            '      "technology": "string",\n'
            '      "confidence": "high | medium | low"\n'
            '    }\n'
            '  ],\n'
            '  "architecture_relationships": [\n'
            '    {\n'
            '      "source": "string",\n'
            '      "target": "string",\n'
            '      "relationship": "string",\n'
            '      "direction": "string",\n'
            '      "confidence": "high | medium | low"\n'
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
