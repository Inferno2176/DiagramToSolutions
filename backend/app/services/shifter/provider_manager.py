import logging
from typing import Dict, List, Optional, Tuple, Set

from app.config import (
    LLM_PROVIDER_CHAIN,
    GEMINI_MODEL_CHAIN,
    GROK_MODEL_CHAIN,
    OPENAI_MODEL_CHAIN,
    GEMINI_API_KEY,
    GROK_API_KEY,
    OPENAI_API_KEY
)
from app.services.shifter.types import ShiftReason
from app.services.shifter.providers.base import BaseLLMProvider
from app.services.shifter.providers.gemini_provider import GeminiProvider
from app.services.shifter.providers.openai_compatible_provider import OpenAICompatibleProvider

logger = logging.getLogger("provider_manager")

class ProviderManager:
    """
    Manages the two-level fallback hierarchy:
    Level 1: Models within active provider
    Level 2: Shift to next provider
    """

    def __init__(
        self,
        provider_chain: Optional[List[str]] = None,
        provider_models: Optional[Dict[str, List[str]]] = None,
        api_keys: Optional[Dict[str, str]] = None
    ):
        self.provider_chain = [p.lower().strip() for p in (provider_chain or LLM_PROVIDER_CHAIN)]

        default_models = {
            "gemini": list(GEMINI_MODEL_CHAIN),
            "grok": list(GROK_MODEL_CHAIN),
            "openai": list(OPENAI_MODEL_CHAIN)
        }
        if provider_models:
            for p, models in provider_models.items():
                default_models[p.lower().strip()] = list(models)

        self.provider_models = default_models

        default_keys = {
            "gemini": GEMINI_API_KEY,
            "grok": GROK_API_KEY,
            "openai": OPENAI_API_KEY
        }
        if api_keys:
            for p, key in api_keys.items():
                default_keys[p.lower().strip()] = key

        self.api_keys = default_keys

    def get_provider_instance(self, provider_name: str) -> BaseLLMProvider:
        p_name = provider_name.lower().strip()
        api_key = self.api_keys.get(p_name, "")

        if p_name == "gemini":
            return GeminiProvider(api_key=api_key)
        elif p_name in ["grok", "openai"]:
            return OpenAICompatibleProvider(provider_name=p_name, api_key=api_key)
        else:
            return OpenAICompatibleProvider(provider_name=p_name, api_key=api_key)

    def get_initial_target(self) -> Tuple[Optional[str], Optional[str]]:
        """
        Returns the initial (provider, model) target.
        """
        for p in self.provider_chain:
            models = self.provider_models.get(p, [])
            if models:
                return p, models[0]
        return None, None

    def get_next_target(
        self,
        current_provider: str,
        current_model: str,
        reason: ShiftReason,
        attempted_models: Set[str]
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Resolves the next (provider, model) target based on error classification and 2-level hierarchy.

        - If PROVIDER_QUOTA_EXHAUSTED: Skips all remaining models of current_provider and shifts to next provider.
        - Otherwise (MODEL_* errors, RATE_LIMITED, TIMEOUT, MODEL_UNAVAILABLE):
          Tries next model in current_provider first. If provider's models are exhausted, moves to next provider.
        """
        c_provider = current_provider.lower().strip()
        c_model = current_model.strip()

        if c_provider not in self.provider_chain:
            return self.get_initial_target()

        provider_idx = self.provider_chain.index(c_provider)
        models_for_provider = self.provider_models.get(c_provider, [])

        # If PROVIDER_QUOTA_EXHAUSTED -> skip all models of this provider immediately!
        if reason == ShiftReason.PROVIDER_QUOTA_EXHAUSTED:
            logger.warning(f"Provider '{c_provider}' quota exhausted. Skipping remaining models of '{c_provider}'.")
            return self._get_first_model_of_next_provider(provider_idx, attempted_models)

        # Level 1: Find next unattempted model within current provider
        if c_model in models_for_provider:
            model_idx = models_for_provider.index(c_model)
            for m in models_for_provider[model_idx + 1:]:
                target_key = f"{c_provider}:{m}"
                if target_key not in attempted_models:
                    return c_provider, m

        # Level 2: Shift to next provider
        logger.info(f"All models for provider '{c_provider}' exhausted or attempted. Shifting to next provider.")
        return self._get_first_model_of_next_provider(provider_idx, attempted_models)

    def _get_first_model_of_next_provider(
        self,
        current_provider_idx: int,
        attempted_models: Set[str]
    ) -> Tuple[Optional[str], Optional[str]]:
        for next_p_idx in range(current_provider_idx + 1, len(self.provider_chain)):
            next_provider = self.provider_chain[next_p_idx]
            # Check if API key is present for this provider (if any key is required)
            key = self.api_keys.get(next_provider, "")
            next_models = self.provider_models.get(next_provider, [])
            for m in next_models:
                target_key = f"{next_provider}:{m}"
                if target_key not in attempted_models:
                    return next_provider, m
        return None, None
