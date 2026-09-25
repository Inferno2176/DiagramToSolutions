import json
import re
from typing import Dict, Any, Optional, Tuple
from google import genai
from google.genai import types

from app.services.shifter.providers.base import BaseLLMProvider
from app.services.shifter.types import ContextHandoff

def clean_json_response(text: str) -> str:
    text = text.strip()
    match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL | re.IGNORECASE)
    if match:
        text = match.group(1).strip()
    return text

class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str):
        super().__init__(provider_name="gemini", api_key=api_key)

    async def generate_analysis(self, model_name: str, context: ContextHandoff) -> Tuple[Dict[str, Any], str, Optional[Dict[str, int]]]:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is missing or empty")

        client = genai.Client(api_key=self.api_key)
        prompt = self.build_prompt(context)

        response = await client.aio.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        if not response or not response.text or not response.text.strip():
            raise ValueError(f"Gemini model {model_name} returned an empty response")

        raw_text = response.text
        cleaned = clean_json_response(raw_text)

        parsed_json = json.loads(cleaned)

        token_usage = None
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            token_usage = {
                "prompt_tokens": getattr(response.usage_metadata, "prompt_token_count", 0),
                "completion_tokens": getattr(response.usage_metadata, "candidates_token_count", 0),
                "total_tokens": getattr(response.usage_metadata, "total_token_count", 0)
            }

        return parsed_json, raw_text, token_usage
