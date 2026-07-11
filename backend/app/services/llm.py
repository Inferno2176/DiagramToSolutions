import os
import json
import re
from typing import Dict, Any, Union, Optional
from google import genai
from google.genai import types
from google.genai import errors

def clean_json_response(text: str) -> str:
    """
    Cleans markdown JSON code blocks from the raw response text if present.
    """
    text = text.strip()
    match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL | re.IGNORECASE)
    if match:
        text = match.group(1).strip()
    return text

async def analyze_architecture_gemini(ocr_text: str, ocr_json: Optional[Union[Dict[str, Any], list]] = None) -> Dict[str, Any]:
    """
    Analyze OCR text and OCR developer JSON using Google Gemini.
    
    Args:
        ocr_text: The extracted text string from the diagram.
        ocr_json: The optional raw OCR developer output (dict or list).
        
    Returns:
        Dict[str, Any]: Parsed JSON response containing:
            - summary
            - workflow
            - tech_stack
            - components
            - suggested_apis
            - database_schema
    """
    # 1. Validate GEMINI_API_KEY
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is missing or empty")
    
    # 2. Validate OCR text
    if not ocr_text or not ocr_text.strip():
        raise ValueError("OCR extracted text is empty")
        
    # 3. Build the prompt
    prompt = (
        "You are a Senior Enterprise Solution Architect. You are analyzing OCR text and OCR developer JSON extracted from a software architecture diagram. "
        "You must understand the architecture and generate useful engineering analysis.\n\n"
        "RULES:\n"
        "1. Use detected OCR information as the primary source.\n"
        "2. Do not invent unrelated technologies.\n"
        "3. Technologies explicitly detected in OCR must be treated as detected technologies.\n"
        "4. Logical architecture components may be inferred when strongly supported by labels.\n"
        "5. Clearly distinguish detected architecture information from suggested engineering outputs.\n"
        "6. Workflow relationships may be logically inferred from OCR labels, but avoid claiming exact connections when the OCR data does not clearly support them.\n"
        "7. Suggested APIs are recommendations based on the understood architecture.\n"
        "8. Database schema is a suggested engineering design based on the architecture.\n"
        "9. Return valid JSON only.\n"
        "10. Do not return Markdown or JSON code fences.\n\n"
        "SECTION REQUIREMENTS:\n\n"
        "SUMMARY:\n"
        "Generate:\n"
        "- Architecture name\n"
        "- Architecture type\n"
        "- A concise architecture overview\n\n"
        "The overview should explain what the system does and its major architectural flow.\n\n"
        "WORKFLOW:\n"
        "Generate a logical step-by-step workflow.\n\n"
        "Example:\n"
        "Step 1 - User Upload\n"
        "The user uploads an image through the frontend.\n\n"
        "Step 2 - Backend Processing\n"
        "FastAPI receives and validates the uploaded file.\n\n"
        "Step 3 - OCR Processing\n"
        "PaddleOCR extracts text and bounding box information.\n\n"
        "Workflow steps must be returned in logical order.\n\n"
        "TECH STACK:\n"
        "List technologies explicitly detected in OCR.\n\n"
        "For each technology return:\n"
        "- Technology name\n"
        "- Category\n"
        "- Purpose\n\n"
        "Example:\n"
        "{\n"
        '  "technology": "FastAPI",\n'
        '  "category": "Backend Framework",\n'
        '  "purpose": "Receives and processes image upload requests"\n'
        "}\n\n"
        "Do not add unrelated technologies.\n\n"
        "COMPONENTS:\n"
        "Identify logical architecture components.\n\n"
        "Examples:\n"
        "Frontend\n"
        "Backend API\n"
        "OCR Engine\n"
        "Storage\n\n"
        "For each component return:\n"
        "- Name\n"
        "- Type\n"
        "- Purpose\n\n"
        "SUGGESTED APIs:\n"
        "Generate useful REST API recommendations based on the architecture.\n\n"
        "For the OCR architecture example, possible APIs may include:\n\n"
        "POST /api/upload\n"
        "POST /api/ocr/process\n"
        "GET /api/ocr/results/{id}\n\n"
        "These APIs are engineering recommendations and do not need to be explicitly visible in the OCR diagram.\n\n"
        "DATABASE SCHEMA:\n"
        "Determine whether persistent storage is useful for the architecture.\n\n"
        "If persistent storage is not required:\n\n"
        "{\n"
        '  "required": false,\n'
        '  "reason": "Explanation",\n'
        '  "entities": []\n'
        "}\n\n"
        "If persistent storage is useful or detected, suggest logical database entities.\n\n"
        "Example:\n\n"
        "{\n"
        '  "name": "OCRResult",\n'
        '  "purpose": "Stores OCR processing results",\n'
        '  "suggested_fields": [\n'
        '    "id",\n'
        '    "filename",\n'
        '    "extracted_text",\n'
        '    "created_at"\n'
        '  ]\n'
        "}\n\n"
        f"OCR Extracted Text:\n{ocr_text}\n\n"
    )
    
    if ocr_json is not None:
        prompt += f"OCR Developer JSON Output:\n{json.dumps(ocr_json, indent=2)}\n\n"
        
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
    
    # 4. Initialize client and send request to Gemini
    client = genai.Client(api_key=api_key)
    models_to_try = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.0-flash"]
    response = None
    last_error = None
    
    import logging
    logger = logging.getLogger("llm_service")
    
    for model_name in models_to_try:
        try:
            logger.info(f"Attempting Gemini generation with model {model_name}")
            response = await client.aio.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            logger.info(f"Successfully generated content using model {model_name}")
            break
        except Exception as e:
            last_error = e
            logger.warning(f"Failed to generate content with model {model_name}: {e}. Trying fallback...")
            
    if response is None:
        raise RuntimeError(f"Gemini API call failed for all models. Last error: {str(last_error)}") from last_error
        
    # 5. Validate Gemini response
    if not response or not response.text or not response.text.strip():
        raise ValueError("Gemini returned an empty response")
        
    # 6. Remove markdown JSON fences
    cleaned_text = clean_json_response(response.text)
    
    # 7. Parse the response into a Python dictionary
    try:
        parsed_result = json.loads(cleaned_text)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Failed to parse Gemini response as JSON: {str(e)}. "
            f"Raw response: {response.text}"
        ) from e
        
    # 8. Validate the parsed structure
    required_keys = ["summary", "workflow", "tech_stack", "components", "suggested_apis", "database_schema"]
    for key in required_keys:
        if key not in parsed_result:
            raise ValueError(
                f"Missing required key '{key}' in Gemini response. "
                f"Parsed JSON: {parsed_result}"
            )
    return parsed_result
