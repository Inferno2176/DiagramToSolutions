import time
import asyncio
import logging
from typing import Dict, Any, Optional, List

from app.config import (
    MAX_MODEL_SWITCHES,
    MODEL_REQUEST_TIMEOUT_SECONDS
)
from app.services.shifter.types import (
    ShiftReason,
    ShiftLog,
    ContextHandoff,
    ExecutionResult,
    NoFallbackAvailableError,
    AuthenticationError
)
from app.services.shifter.detectors import TokenAndErrorDetector
from app.services.shifter.provider_manager import ProviderManager

logger = logging.getLogger("agent_model_shifter")

class AgentModelShifter:
    """
    Core Agent Model Shifter Orchestrator.
    Manages two-level fallback execution (Models within Provider -> Next Provider),
    async timeout protection, error classification, and context handoff.
    """

    def __init__(
        self,
        provider_manager: Optional[ProviderManager] = None,
        max_switches: Optional[int] = None,
        timeout_seconds: Optional[float] = None
    ):
        self.provider_manager = provider_manager or ProviderManager()
        self.max_switches = max_switches if max_switches is not None else MAX_MODEL_SWITCHES
        self.timeout_seconds = timeout_seconds if timeout_seconds is not None else MODEL_REQUEST_TIMEOUT_SECONDS

    async def execute_task(
        self,
        context: ContextHandoff,
        initial_provider: Optional[str] = None,
        initial_model: Optional[str] = None
    ) -> ExecutionResult:
        # Resolve starting provider and model
        if initial_provider and initial_model:
            cur_provider, cur_model = initial_provider.lower().strip(), initial_model.strip()
        else:
            cur_provider, cur_model = self.provider_manager.get_initial_target()

        if not cur_provider or not cur_model:
            raise NoFallbackAvailableError(
                "No valid LLM providers or models configured.",
                execution_metadata={
                    "initial_provider": str(initial_provider),
                    "initial_model": str(initial_model),
                    "final_provider": None,
                    "final_model": None,
                    "switch_count": 0,
                    "switch_history": []
                }
            )

        start_provider, start_model = cur_provider, cur_model
        switch_count = 0

        while True:
            context.record_attempt(cur_provider, cur_model)
            logger.info(f"[MODEL] Starting task execution on provider: '{cur_provider}', model: '{cur_model}'")

            provider_inst = self.provider_manager.get_provider_instance(cur_provider)
            call_start_time = time.time()

            try:
                # Wrap provider call with async timeout
                parsed_json, raw_text, token_usage = await asyncio.wait_for(
                    provider_inst.generate_analysis(cur_model, context),
                    timeout=self.timeout_seconds
                )

                latency = time.time() - call_start_time
                logger.info(f"[STATUS] Execution successful on '{cur_provider}/{cur_model}' in {latency:.2f}s")

                return ExecutionResult(
                    analysis_json=parsed_json,
                    raw_text=raw_text,
                    provider=cur_provider,
                    model=cur_model,
                    latency_seconds=latency,
                    token_usage=token_usage,
                    switch_history=list(context.switch_history)
                )

            except Exception as exc:
                latency = time.time() - call_start_time
                reason = TokenAndErrorDetector.classify_exception(exc)

                logger.warning(f"[FAIL] Execution failed on '{cur_provider}/{cur_model}' after {latency:.2f}s. Reason: {reason.value}. Error: {str(exc)}")

                # Check for unrecoverable Auth Error if no other provider has credentials
                if reason == ShiftReason.AUTH_ERROR:
                    next_p, next_m = self.provider_manager.get_next_target(cur_provider, cur_model, reason, context.attempted_models)
                    if not next_p:
                        raise AuthenticationError(f"Authentication failed for provider '{cur_provider}': {str(exc)}") from exc
                    logger.warning(f"Authentication/credentials missing for '{cur_provider}'. Moving to next provider '{next_p}'.")

                # Check max switches
                if switch_count >= self.max_switches:
                    logger.error(f"[MAX SWITCHES] Reached maximum allowed switches ({self.max_switches}). Stopping fallback chain.")
                    meta = {
                        "initial_provider": start_provider,
                        "initial_model": start_model,
                        "final_provider": cur_provider,
                        "final_model": cur_model,
                        "switch_count": len(context.switch_history),
                        "switch_history": [s.to_dict() for s in context.switch_history]
                    }
                    raise NoFallbackAvailableError(
                        f"Execution failed: reached maximum model switch limit ({self.max_switches}). Last error: {str(exc)}",
                        execution_metadata=meta
                    ) from exc

                # Resolve next target model/provider
                next_provider, next_model = self.provider_manager.get_next_target(
                    cur_provider,
                    cur_model,
                    reason,
                    context.attempted_models
                )

                if not next_provider or not next_model:
                    logger.error(f"[NO FALLBACK] All configured providers and models have been exhausted.")
                    meta = {
                        "initial_provider": start_provider,
                        "initial_model": start_model,
                        "final_provider": cur_provider,
                        "final_model": cur_model,
                        "switch_count": len(context.switch_history),
                        "switch_history": [s.to_dict() for s in context.switch_history]
                    }
                    raise NoFallbackAvailableError(
                        f"Execution failed: all fallback providers/models exhausted. Last error: {str(exc)}",
                        execution_metadata=meta
                    ) from exc

                # Record switch log
                shift_log = ShiftLog(
                    from_provider=cur_provider,
                    from_model=cur_model,
                    to_provider=next_provider,
                    to_model=next_model,
                    reason=reason,
                    latency_seconds=latency
                )
                context.switch_history.append(shift_log)
                switch_count += 1

                if cur_provider.lower() != next_provider.lower():
                    logger.info(
                        f"[PROVIDER SHIFT] Provider '{cur_provider}' -> '{next_provider}'. "
                        f"Targeting model: '{next_model}'. Reason: {reason.value}"
                    )
                else:
                    logger.info(
                        f"[SHIFT] Model '{cur_provider}/{cur_model}' -> '{next_provider}/{next_model}'. "
                        f"Reason: {reason.value}"
                    )

                # Prepare handoff state for next attempt
                cur_provider, cur_model = next_provider, next_model
