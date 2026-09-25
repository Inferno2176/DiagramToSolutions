import json
import re
import httpx
from typing import Dict, Any, Optional, Tuple

from app.services.shifter.providers.base import BaseLLMProvider
from app.services.shifter.types import ContextHandoff

def clean_json_response(text: str) -> str:
    text = text.strip()
    match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL | re.IGNORECASE)
    if match:
        text = match.group(1).strip()
    return text

class OpenAICompatibleProvider(BaseLLMProvider):
    def __init__(self, provider_name: str, api_key: str, base_url: Optional[str] = None):
        super().__init__(provider_name=provider_name, api_key=api_key)
        if base_url:
            self.endpoint = base_url
        elif self.provider_name == "grok":
            self.endpoint = "https://api.x.ai/v1/chat/completions"
        elif self.provider_name == "openai":
            self.endpoint = "https://api.openai.com/v1/chat/completions"
        else:
            self.endpoint = "https://api.openai.com/v1/chat/completions"

    async def generate_analysis(self, model_name: str, context: ContextHandoff) -> Tuple[Dict[str, Any], str, Optional[Dict[str, int]]]:
        if not self.api_key:
            raise ValueError(f"{self.provider_name.upper()}_API_KEY environment variable is missing or empty")

        prompt = self.build_prompt(context)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": "You are a Senior Enterprise Solution Architect."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"}
        }

        async with httpx.AsyncClient(timeout=None) as client:
            res = await client.post(self.endpoint, headers=headers, json=payload)
            if res.status_code != 200:
                raise RuntimeError(f"{self.provider_name.capitalize()} API error ({res.status_code}): {res.text}")

            res_json = res.json()
            choices = res_json.get("choices", [])
            if not choices:
                raise ValueError(f"{self.provider_name.capitalize()} returned empty choices")

            raw_text = choices[0].get("message", {}).get("content", "")
            cleaned = clean_json_response(raw_text)
            parsed_json = json.loads(cleaned)

            token_usage = None
            if "usage" in res_json:
                token_usage = {
                    "prompt_tokens": res_json["usage"].get("prompt_tokens", 0),
                    "completion_tokens": res_json["usage"].get("completion_tokens", 0),
                    "total_tokens": res_json["usage"].get("total_tokens", 0)
                }

            return parsed_json, raw_text, token_usage
