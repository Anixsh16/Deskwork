"""Deskwork Gemini AI client with throttling, caching, retries, and structured outputs."""

import hashlib
import json
import os
import time
from typing import Any, Type, TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

# Model identifiers from specification
MODEL_35_FLASH_LITE = "gemini-3.5-flash-lite"
MODEL_31_FLASH_LITE = "gemini-3.1-flash-lite"


class GeminiClientWrapper:
    """Wrapper isolating the Gemini API and providing robust operational safeguards."""

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self._client = None
        self._init_client()

    def _init_client(self):
        if not self.api_key:
            return
        try:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
        except ImportError:
            self._client = None

    def compute_cache_key(self, model: str, prompt_text: str, content_hash: str) -> str:
        raw = f"{model}:{prompt_text}:{content_hash}".encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    def call_structured(
        self,
        model: str,
        system_instruction: str,
        contents: list[Any],
        schema_cls: Type[T],
        thinking_level: str = "low",
        max_retries: int = 3,
    ) -> T:
        """Call Gemini model with structured output matching a Pydantic schema."""
        if not self._client:
            raise RuntimeError(
                "Gemini API client is not initialized. Ensure GEMINI_API_KEY is set and google-genai is installed."
            )

        from google.genai import types

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_json_schema=schema_cls.model_json_schema(),
            thinking_config=types.ThinkingConfig(thinking_level=thinking_level),
        )

        last_error = None
        for attempt in range(max_retries):
            try:
                response = self._client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=config,
                )
                if not response or not response.text:
                    raise ValueError("Empty response received from Gemini model.")

                return schema_cls.model_validate_json(response.text)

            except Exception as exc:
                last_error = exc
                wait_time = (2 ** attempt) + 0.5
                time.sleep(wait_time)

        raise RuntimeError(f"Gemini API request failed after {max_retries} attempts: {last_error}")


# Global default client instance
ai_client = GeminiClientWrapper()
