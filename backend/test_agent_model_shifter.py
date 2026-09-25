import asyncio
import unittest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.shifter.types import (
    ShiftReason,
    ContextHandoff,
    NoFallbackAvailableError,
    AuthenticationError
)
from app.services.shifter.provider_manager import ProviderManager
from app.services.shifter.detectors import TokenAndErrorDetector
from app.services.shifter.shifter import AgentModelShifter

SAMPLE_ANALYSIS_JSON = {
    "summary": {"architecture_name": "Test App", "architecture_type": "Web App", "overview": "Test overview"},
    "workflow": [{"step": 1, "title": "Start", "description": "Step 1"}],
    "tech_stack": [{"technology": "FastAPI", "category": "Backend", "purpose": "API"}],
    "components": [{"name": "API Gateway", "type": "Gateway", "purpose": "Routing"}],
    "suggested_apis": [{"method": "GET", "endpoint": "/api/test", "purpose": "Test API"}],
    "database_schema": {"required": False, "reason": "Not needed", "entities": []}
}

class TestAgentModelShifter(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.provider_chain = ["gemini", "grok", "openai"]
        self.provider_models = {
            "gemini": ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash"],
            "grok": ["grok-2-latest", "grok-beta"],
            "openai": ["gpt-4o", "gpt-4o-mini"]
        }
        self.api_keys = {
            "gemini": "fake_gemini_key",
            "grok": "fake_grok_key",
            "openai": "fake_openai_key"
        }
        self.manager = ProviderManager(
            provider_chain=self.provider_chain,
            provider_models=self.provider_models,
            api_keys=self.api_keys
        )
        self.context = ContextHandoff(
            original_user_request="Analyze diagram",
            ocr_text="FastAPI Nginx Redis PostgreSQL",
            ocr_json={"detected": ["FastAPI", "Nginx", "Redis"]}
        )

    async def test_model_a_success(self):
        """Test 1: Normal execution on primary model succeeds without switching."""
        shifter = AgentModelShifter(provider_manager=self.manager, max_switches=5, timeout_seconds=10.0)

        mock_gemini = MagicMock()
        mock_gemini.generate_analysis = AsyncMock(return_value=(SAMPLE_ANALYSIS_JSON, "{}", {"total_tokens": 100}))

        with patch.object(self.manager, "get_provider_instance", return_value=mock_gemini):
            res = await shifter.execute_task(self.context)

            self.assertEqual(res.provider, "gemini")
            self.assertEqual(res.model, "gemini-2.5-flash")
            self.assertEqual(len(res.switch_history), 0)
            self.assertEqual(res.analysis_json["summary"]["architecture_name"], "Test App")

    async def test_model_token_exhaustion_shift(self):
        """Test 2: Model A token limit reached -> shifts to Model B in same provider."""
        shifter = AgentModelShifter(provider_manager=self.manager, max_switches=5, timeout_seconds=10.0)

        mock_gemini = MagicMock()
        mock_gemini.generate_analysis = AsyncMock(side_effect=[
            RuntimeError("output token limit reached - finish_reason: MAX_TOKENS"),
            (SAMPLE_ANALYSIS_JSON, "{}", {"total_tokens": 200})
        ])

        with patch.object(self.manager, "get_provider_instance", return_value=mock_gemini):
            res = await shifter.execute_task(self.context)

            self.assertEqual(res.provider, "gemini")
            self.assertEqual(res.model, "gemini-2.5-pro")
            self.assertEqual(len(res.switch_history), 1)
            self.assertEqual(res.switch_history[0].reason, ShiftReason.MODEL_TOKEN_EXHAUSTED)

    async def test_multi_model_exhaustion_in_provider(self):
        """Test 3: Gemini Model A -> Gemini Model B -> Gemini Model C succeeds."""
        shifter = AgentModelShifter(provider_manager=self.manager, max_switches=5, timeout_seconds=10.0)

        mock_gemini = MagicMock()
        mock_gemini.generate_analysis = AsyncMock(side_effect=[
            RuntimeError("output token limit reached"),
            RuntimeError("context_length_exceeded"),
            (SAMPLE_ANALYSIS_JSON, "{}", {"total_tokens": 300})
        ])

        with patch.object(self.manager, "get_provider_instance", return_value=mock_gemini):
            res = await shifter.execute_task(self.context)

            self.assertEqual(res.provider, "gemini")
            self.assertEqual(res.model, "gemini-1.5-flash")
            self.assertEqual(len(res.switch_history), 2)
            self.assertEqual(res.switch_history[0].reason, ShiftReason.MODEL_TOKEN_EXHAUSTED)
            self.assertEqual(res.switch_history[1].reason, ShiftReason.MODEL_CONTEXT_LIMIT)

    async def test_provider_quota_exhaustion_shift(self):
        """Test 4: Gemini PROVIDER_QUOTA_EXHAUSTED -> skips remaining Gemini models -> shifts to Grok immediately."""
        shifter = AgentModelShifter(provider_manager=self.manager, max_switches=5, timeout_seconds=10.0)

        mock_gemini = MagicMock()
        mock_gemini.generate_analysis = AsyncMock(side_effect=RuntimeError("Quota exceeded for project / RESOURCE_EXHAUSTED"))

        mock_grok = MagicMock()
        mock_grok.generate_analysis = AsyncMock(return_value=(SAMPLE_ANALYSIS_JSON, "{}", {"total_tokens": 150}))

        def get_instance_side_effect(provider_name):
            if provider_name == "gemini":
                return mock_gemini
            return mock_grok

        with patch.object(self.manager, "get_provider_instance", side_effect=get_instance_side_effect):
            res = await shifter.execute_task(self.context)

            self.assertEqual(res.provider, "grok")
            self.assertEqual(res.model, "grok-2-latest")
            self.assertEqual(len(res.switch_history), 1)
            self.assertEqual(res.switch_history[0].reason, ShiftReason.PROVIDER_QUOTA_EXHAUSTED)
            # Gemini Model B and Model C were skipped! Only 1 call was made to gemini.
            self.assertEqual(mock_gemini.generate_analysis.call_count, 1)

    async def test_all_gemini_models_fail_shift_to_grok(self):
        """Test 5: All Gemini models fail with model-level errors -> shifts to Grok Model A."""
        shifter = AgentModelShifter(provider_manager=self.manager, max_switches=5, timeout_seconds=10.0)

        mock_gemini = MagicMock()
        mock_gemini.generate_analysis = AsyncMock(side_effect=[
            RuntimeError("output token limit reached"),
            RuntimeError("503 Service Unavailable"),
            RuntimeError("rate limit exceeded 429")
        ])

        mock_grok = MagicMock()
        mock_grok.generate_analysis = AsyncMock(return_value=(SAMPLE_ANALYSIS_JSON, "{}", {"total_tokens": 120}))

        def get_instance_side_effect(provider_name):
            if provider_name == "gemini":
                return mock_gemini
            return mock_grok

        with patch.object(self.manager, "get_provider_instance", side_effect=get_instance_side_effect):
            res = await shifter.execute_task(self.context)

            self.assertEqual(res.provider, "grok")
            self.assertEqual(res.model, "grok-2-latest")
            self.assertEqual(len(res.switch_history), 3)

    async def test_model_timeout_shift(self):
        """Test 6: Async timeout (asyncio.TimeoutError) -> TIMEOUT / MODEL_OVERLOADED -> next model succeeds."""
        shifter = AgentModelShifter(provider_manager=self.manager, max_switches=5, timeout_seconds=0.1)

        mock_gemini = MagicMock()
        mock_gemini.generate_analysis = AsyncMock(side_effect=[
            asyncio.TimeoutError("Request timed out"),
            (SAMPLE_ANALYSIS_JSON, "{}", {"total_tokens": 100})
        ])

        with patch.object(self.manager, "get_provider_instance", return_value=mock_gemini):
            res = await shifter.execute_task(self.context)

            self.assertEqual(res.provider, "gemini")
            self.assertEqual(res.model, "gemini-2.5-pro")
            self.assertEqual(len(res.switch_history), 1)
            self.assertEqual(res.switch_history[0].reason, ShiftReason.TIMEOUT)

    async def test_context_preservation(self):
        """Test 7: ContextHandoff preserves completed stages, prompt, OCR data, and switch history across handoffs."""
        shifter = AgentModelShifter(provider_manager=self.manager, max_switches=5, timeout_seconds=10.0)

        captured_contexts = []
        async def mock_generate(model, ctx):
            captured_contexts.append(ctx)
            if len(captured_contexts) == 1:
                raise RuntimeError("finish_reason: MAX_TOKENS")
            return SAMPLE_ANALYSIS_JSON, "{}", {}

        mock_gemini = MagicMock()
        mock_gemini.generate_analysis = AsyncMock(side_effect=mock_generate)

        with patch.object(self.manager, "get_provider_instance", return_value=mock_gemini):
            res = await shifter.execute_task(self.context)

            self.assertEqual(len(captured_contexts), 2)
            handoff_ctx = captured_contexts[1]
            self.assertIn("ocr_completed", handoff_ctx.completed_stages)
            self.assertEqual(handoff_ctx.ocr_text, "FastAPI Nginx Redis PostgreSQL")
            self.assertEqual(len(handoff_ctx.switch_history), 1)
            self.assertEqual(handoff_ctx.switch_history[0].from_model, "gemini-2.5-flash")

    async def test_auth_error_handling(self):
        """Test 8: Auth error without alternative providers raises AuthenticationError."""
        manager_single = ProviderManager(
            provider_chain=["gemini"],
            provider_models={"gemini": ["gemini-2.5-flash"]},
            api_keys={"gemini": "invalid_key"}
        )
        shifter = AgentModelShifter(provider_manager=manager_single, max_switches=5, timeout_seconds=10.0)

        mock_gemini = MagicMock()
        mock_gemini.generate_analysis = AsyncMock(side_effect=RuntimeError("401 Unauthorized - invalid_api_key"))

        with patch.object(manager_single, "get_provider_instance", return_value=mock_gemini):
            with self.assertRaises(AuthenticationError):
                await shifter.execute_task(self.context)

    async def test_loop_prevention(self):
        """Test 9: Attempted set tracking prevents retrying models that already failed."""
        shifter = AgentModelShifter(provider_manager=self.manager, max_switches=10, timeout_seconds=10.0)

        attempted = set()
        async def mock_generate(model, ctx):
            attempted.add(model)
            raise RuntimeError("503 Service Unavailable")

        mock_gemini = MagicMock()
        mock_gemini.generate_analysis = AsyncMock(side_effect=mock_generate)

        mock_grok = MagicMock()
        mock_grok.generate_analysis = AsyncMock(side_effect=mock_generate)

        mock_openai = MagicMock()
        mock_openai.generate_analysis = AsyncMock(side_effect=mock_generate)

        def get_instance_side_effect(p):
            if p == "gemini":
                return mock_gemini
            elif p == "grok":
                return mock_grok
            return mock_openai

        with patch.object(self.manager, "get_provider_instance", side_effect=get_instance_side_effect):
            with self.assertRaises(NoFallbackAvailableError):
                await shifter.execute_task(self.context)

            # Check that each model was only attempted once
            expected_models = {"gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "grok-2-latest", "grok-beta", "gpt-4o", "gpt-4o-mini"}
            self.assertEqual(attempted, expected_models)

    async def test_max_switch_count_enforcement(self):
        """Test 10: Reaching max switches raises NoFallbackAvailableError."""
        shifter = AgentModelShifter(provider_manager=self.manager, max_switches=2, timeout_seconds=10.0)

        mock_gemini = MagicMock()
        mock_gemini.generate_analysis = AsyncMock(side_effect=RuntimeError("503 Service Unavailable"))

        with patch.object(self.manager, "get_provider_instance", return_value=mock_gemini):
            with self.assertRaises(NoFallbackAvailableError) as ctx:
                await shifter.execute_task(self.context)

            self.assertIn("reached maximum model switch limit", str(ctx.exception))

    async def test_no_fallback_available(self):
        """Test 11: All fallbacks exhausted raises NoFallbackAvailableError with execution metadata."""
        shifter = AgentModelShifter(provider_manager=self.manager, max_switches=10, timeout_seconds=10.0)

        mock_provider = MagicMock()
        mock_provider.generate_analysis = AsyncMock(side_effect=RuntimeError("500 Internal Error"))

        with patch.object(self.manager, "get_provider_instance", return_value=mock_provider):
            with self.assertRaises(NoFallbackAvailableError) as ctx:
                await shifter.execute_task(self.context)

            meta = ctx.exception.execution_metadata
            self.assertIn("switch_count", meta)
            self.assertIn("switch_history", meta)

if __name__ == "__main__":
    unittest.main()
