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
        spatial relationships, diagram classification, architecture relationships, and actionable
        compatible technology stack recommendations.
        """
        prompt = (
            "You are a Principal Enterprise Solutions Architect and Systems Engineering Specialist.\n"
            "You are analyzing a software architecture diagram combining: (1) the visual diagram image, (2) OCR extracted text, and (3) OCR developer bounding-box coordinates.\n\n"
            "ACCURACY & INTERPRETATION RULES:\n"
            "1. Combine visual diagram image observation with OCR extracted text and spatial bounding boxes.\n"
            "2. Identify visible arrows, connectors, flow lines, containers, and groupings to understand relationships, data flow directions, and network boundaries.\n"
            "3. Do NOT assume a relationship exists simply because two components appear near each other. Use visible arrows, lines, labels, and diagram semantics.\n"
            "4. If a relationship cannot be confidently determined, mark confidence as 'low' or omit rather than inventing one.\n"
            "5. Classify diagram type accurately (e.g. System Architecture, Application Architecture, Microservices Architecture, Cloud Architecture, Data Flow Diagram, Process Flowchart, UML, Sequence Diagram, Entity Relationship Diagram, Deployment Diagram, Agentic AI Architecture, or Other).\n\n"
            "CRITICAL TECHNOLOGY STACK RECOMMENDATION INSTRUCTIONS:\n"
            "- Architecture diagrams very frequently display abstract or generic tier blocks (e.g., 'Web Application', 'Mobile Application', 'Load Balancer', 'Microservices Layer', 'User Service', 'Booking Service', 'Database', 'Cache', 'Payment Gateway', 'Compute / Hosting', 'Storage').\n"
            "- In the 'tech_stack' section, you MUST NOT simply echo back generic block names like 'Database', 'Cache', 'Load Balancer', or 'Microservices Layer'.\n"
            "- Instead, you MUST recommend a concrete, production-ready, industry-standard, and MUTUALLY-COMPATIBLE technology stack (e.g., Python FastAPI, React 18 / Next.js 14, React Native / Flutter, PostgreSQL 16, Redis 7, NGINX Reverse Proxy, Celery / RabbitMQ, Stripe Payments API, Docker & Kubernetes) tailored specifically to the domain, scale, and requirements of the system (e.g., movie booking, e-commerce, banking, streaming, IoT).\n"
            "- Every recommended technology MUST be directly compatible with the other chosen technologies, giving developers a turnkey, cohesive blueprint to build the entire system from scratch.\n"
            "- For EVERY technology item in 'tech_stack', provide:\n"
            "  * 'technology': Specific technology name and version/ecosystem (e.g., 'Python FastAPI', 'PostgreSQL 16', 'React 18 & TypeScript', 'Redis 7', 'NGINX Reverse Proxy', 'React Native (Cross-Platform Mobile)', 'Stripe API & Webhooks', 'Docker & Kubernetes').\n"
            "  * 'category': The architectural layer or tier (e.g., 'Backend Microservices Framework', 'Primary Relational Database', 'Frontend Web Application', 'Frontend Mobile Application', 'In-Memory Cache & Mutex Lock', 'API Gateway & Load Balancer', 'External Payment Gateway', 'Container Orchestration & DevOps').\n"
            "  * 'purpose': Deep, concrete explanation of how this specific tool functions in this system (e.g., for PostgreSQL in a movie booking system: 'Stores user accounts, theater layouts, showtimes, seat inventory, and booking records with strict ACID transaction isolation to guarantee zero double-booking').\n"
            "  * 'compatible_with': A list of 2-4 companion technologies from this recommended stack that it directly interfaces with (e.g., ['Python FastAPI', 'SQLAlchemy ORM', 'Docker']).\n"
            "  * 'why_recommended': 1-2 sentence engineering justification explaining why this specific technology is the optimal production choice for this architecture.\n\n"
            "COMPONENT IMPLEMENTATION ASSIGNMENT:\n"
            "- For each component in the 'components' array, assign a concrete recommended technology or framework to the 'technology' field (e.g., 'Python FastAPI + SQLAlchemy' for Booking Service, 'Redis 7 Distributed Lock' for Seat Reservation Mutex, 'PostgreSQL 16' for Database, 'React 18 SPA' for Web App, 'NGINX' for Load Balancer).\n\n"
            "API CONTRACTS & DATABASE SCHEMA:\n"
            "- Suggested APIs must specify concrete REST endpoints, methods, and payload purposes tailored to the domain (e.g., for Movie Booking: POST /api/v1/bookings/reserve, GET /api/v1/movies/{id}/showtimes, POST /api/v1/payments/checkout).\n"
            "- Database schema must detail core domain entities, their purposes, and realistic field names (e.g., users, movies, theaters, screens, shows, seats, bookings, payments).\n\n"
            "FORMAT RULE: Return valid JSON only. Do not wrap in Markdown code fences.\n\n"
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
            '      "technology": "e.g. Python FastAPI | PostgreSQL 16 | React 18 | Redis 7",\n'
            '      "category": "e.g. Backend Microservices Framework | Primary Database | Frontend Web Client",\n'
            '      "purpose": "Detailed technical purpose in this architecture",\n'
            '      "compatible_with": ["Companion Tech 1", "Companion Tech 2"],\n'
            '      "why_recommended": "Engineering justification for this specific choice"\n'
            '    }\n'
            '  ],\n'
            '  "components": [\n'
            '    {\n'
            '      "name": "string",\n'
            '      "type": "string",\n'
            '      "purpose": "string",\n'
            '      "technology": "e.g. Python (FastAPI) + SQLAlchemy | Redis 7 Mutex | React 18 SPA",\n'
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
