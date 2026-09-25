import re
import asyncio
from typing import Optional, Tuple
from app.services.shifter.types import ShiftReason

class TokenAndErrorDetector:
    """
    Analyzes API error responses, status codes, error messages, and timeouts
    to classify the exact ShiftReason.
    """

    @staticmethod
    def classify_exception(exc: Exception) -> ShiftReason:
        if isinstance(exc, asyncio.TimeoutError):
            return ShiftReason.TIMEOUT

        err_str = str(exc).lower()

        # 1. Auth errors (401, 403, invalid key)
        if any(term in err_str for term in ["401", "403", "unauthorized", "invalid_api_key", "invalid api key", "api_key_invalid", "permission_denied"]):
            return ShiftReason.AUTH_ERROR

        # 2. Provider Quota Exhausted (Account/Billing quota exhausted across entire provider)
        if any(term in err_str for term in ["insufficient_quota", "quota exceeded", "exceeded your current quota", "billing", "credit_limit", "quota_exhausted", "account limit"]):
            return ShiftReason.PROVIDER_QUOTA_EXHAUSTED

        # 3. Model Token Exhausted (Individual generation output token limit)
        if any(term in err_str for term in ["max_tokens", "output token limit", "finish_reason: max_tokens", "token limit reached", "output_length_exceeded"]):
            return ShiftReason.MODEL_TOKEN_EXHAUSTED

        # 4. Model Context Limit (Prompt size exceeds model context length)
        if any(term in err_str for term in ["context_length_exceeded", "context length", "context window", "maximum context length", "too many input tokens"]):
            return ShiftReason.MODEL_CONTEXT_LIMIT

        # 5. Rate Limited (429 Rate limit, temporary concurrency)
        if any(term in err_str for term in ["429", "resource_exhausted", "rate_limit", "rate limit", "too many requests"]):
            return ShiftReason.RATE_LIMITED

        # 6. Model Overloaded / Timeout / Server Busy
        if any(term in err_str for term in ["overloaded", "503", "service_unavailable", "server_error", "gateway_timeout", "504"]):
            return ShiftReason.MODEL_OVERLOADED

        # 7. Model Unavailable (404, unknown model ID, invalid model for project)
        if any(term in err_str for term in ["404", "model_not_found", "model not found", "does not exist", "not_found", "unknown model"]):
            return ShiftReason.MODEL_UNAVAILABLE

        # 8. Invalid Request (400 Bad Request)
        if any(term in err_str for term in ["400", "invalid_argument", "bad request"]):
            return ShiftReason.INVALID_REQUEST

        return ShiftReason.MODEL_UNAVAILABLE
