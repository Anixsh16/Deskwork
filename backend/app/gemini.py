"""Gemini REST client with per-model throttling, retries and structured output."""

import asyncio
import base64
import json
import logging
import random
import time
from collections import deque
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from collections.abc import AsyncIterator
from typing import Any, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from .config import get_settings

log = logging.getLogger("deskwork.gemini")
API = "https://generativelanguage.googleapis.com/v1beta"
T = TypeVar("T", bound=BaseModel)
# A stream that sends nothing for this long is treated as stalled.
STREAM_STALL_SECONDS = 120


class GeminiError(RuntimeError):
    pass


class QuotaExhausted(GeminiError):
    """Every configured API key has used up this model's daily free quota."""


class RateLimiter:
    """Sliding one-minute window on requests and (optionally) tokens.

    `count` is how many requests a call is worth: Google counts every text in an embedding batch separately."""

    def __init__(self, rpm: int, tpm: int | None = None):
        self.rpm, self.tpm = rpm, tpm
        self.events: deque[tuple[float, int, int]] = deque()
        self.lock = asyncio.Lock()

    async def acquire(self, tokens: int = 0, count: int = 1) -> None:
        async with self.lock:
            while True:
                now = time.monotonic()
                while self.events and now - self.events[0][0] >= 60:
                    self.events.popleft()
                used_tokens = sum(e[1] for e in self.events)
                used_requests = sum(e[2] for e in self.events)
                fits_tokens = self.tpm is None or not self.events or used_tokens + tokens <= self.tpm
                fits_requests = not self.events or used_requests + count <= self.rpm
                if fits_requests and fits_tokens:
                    self.events.append((now, tokens, count))
                    return
                await asyncio.sleep(max(0.2, 60 - (now - self.events[0][0])))


_limiters: dict[str, RateLimiter] = {}
_client: httpx.AsyncClient | None = None


def _limiter(model: str) -> RateLimiter:
    s = get_settings()
    if model not in _limiters:
        if model in (s.embed_model, s.embed_fallback_model):
            _limiters[model] = RateLimiter(s.embed_rpm, s.embed_tpm)
        else:
            _limiters[model] = RateLimiter(s.generate_rpm)
    return _limiters[model]


def _http() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=httpx.Timeout(300, connect=20))
    return _client


# (api key, model) -> monotonic time until which that key's daily quota for the model is known to be used up.
_exhausted: dict[tuple[str, str], float] = {}


def _seconds_to_quota_reset() -> float:
    """Free-tier daily quotas reset at midnight Pacific time."""
    now = datetime.now(ZoneInfo("America/Los_Angeles"))
    midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=5, microsecond=0)
    return (midnight - now).total_seconds()


def _keys(model: str) -> list[str]:
    now = time.monotonic()
    return [k for k in get_settings().api_keys if _exhausted.get((k, model), 0) <= now]


def _is_daily_quota(resp: httpx.Response) -> bool:
    try:
        details = resp.json().get("error", {}).get("details", [])
    except Exception:
        return False
    return any("PerDay" in (v.get("quotaId") or "") for d in details for v in d.get("violations", []))


def _mark_exhausted(key: str, model: str) -> None:
    _exhausted[(key, model)] = time.monotonic() + _seconds_to_quota_reset()
    log.warning("Daily quota used up for %s on key ...%s", model, key[-4:])


def daily_quota_left(model: str) -> bool:
    return bool(_keys(model))


def text_part(text: str) -> dict:
    return {"text": text}


def image_part(data: bytes, mime: str = "image/jpeg") -> dict:
    return {"inlineData": {"mimeType": mime, "data": base64.b64encode(data).decode()}}


def _retry_delay(resp: httpx.Response, attempt: int) -> float:
    try:
        for d in resp.json().get("error", {}).get("details", []):
            if "retryDelay" in d:
                return float(str(d["retryDelay"]).rstrip("s")) + 1
    except Exception:
        pass
    return min(60, 2 ** (attempt + 1)) + random.random()


async def _post(model: str, method: str, body: dict, tokens: int = 0, count: int = 1) -> dict:
    last = ""
    for attempt in range(6):
        keys = _keys(model)
        if not keys:
            raise QuotaExhausted(f"Daily quota used up for {model} on every API key")
        await _limiter(model).acquire(tokens, count)
        try:
            r = await _http().post(f"{API}/models/{model}:{method}", json=body, headers={"x-goog-api-key": keys[0]})
        except httpx.HTTPError as e:
            last = str(e)
            await asyncio.sleep(2 ** attempt)
            continue
        if r.status_code == 200:
            return r.json()
        last = f"{r.status_code}: {r.text[:300]}"
        if r.status_code == 429 and _is_daily_quota(r):
            _mark_exhausted(keys[0], model)
            continue
        if r.status_code in (429, 500, 502, 503, 504):
            delay = _retry_delay(r, attempt)
            log.warning("Gemini %s %s, retrying in %.1fs", model, r.status_code, delay)
            await asyncio.sleep(delay)
            continue
        break
    raise GeminiError(f"Gemini request failed ({model}) {last}")


def inline_schema(model: type[BaseModel]) -> dict:
    """Pydantic JSON schema with $refs expanded, since nested refs are not reliably supported."""
    schema = model.model_json_schema()
    defs = schema.pop("$defs", {})

    def resolve(node: Any) -> Any:
        if isinstance(node, dict):
            if "$ref" in node:
                return resolve(defs[node["$ref"].split("/")[-1]])
            return {k: resolve(v) for k, v in node.items() if k != "title"}
        if isinstance(node, list):
            return [resolve(v) for v in node]
        return node

    return resolve(schema)


def _response_text(data: dict) -> str:
    cands = data.get("candidates") or []
    if not cands:
        raise GeminiError(f"Gemini returned no answer: {json.dumps(data)[:300]}")
    cand = cands[0]
    if cand.get("finishReason") not in (None, "STOP"):
        raise GeminiError(f"Gemini stopped early: {cand.get('finishReason')}")
    parts = cand.get("content", {}).get("parts", [])
    return "".join(p.get("text", "") for p in parts if not p.get("thought"))


async def generate_json(
    parts: list[dict],
    schema: type[T],
    *,
    system: str,
    model: str | None = None,
    thinking: str = "low",
    high_res: bool = False,
) -> tuple[T, dict]:
    """Returns the validated object and usage metadata. Retries once on invalid JSON."""
    model = model or get_settings().primary_model
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseJsonSchema": inline_schema(schema),
            "thinkingConfig": {"thinkingLevel": thinking},
            "maxOutputTokens": 32768,
        },
    }
    if high_res:
        body["generationConfig"]["mediaResolution"] = "MEDIA_RESOLUTION_HIGH"
    error: Exception | None = None
    for _ in range(2):
        data = await _post(model, "generateContent", body)
        try:
            return schema.model_validate_json(_response_text(data)), data.get("usageMetadata", {})
        except (ValidationError, GeminiError) as e:
            error = e
            log.warning("Invalid structured output from %s: %s", model, e)
    raise GeminiError(f"Gemini returned an unusable answer: {error}")


async def stream_text(
    contents: list[dict], *, system: str, model: str | None = None, thinking: str = "low"
) -> AsyncIterator[str]:
    model = model or get_settings().primary_model
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {"thinkingConfig": {"thinkingLevel": thinking}, "maxOutputTokens": 32768},
    }
    for attempt in range(5):
        keys = _keys(model)
        if not keys:
            raise QuotaExhausted(f"Daily quota used up for {model} on every API key")
        await _limiter(model).acquire()
        try:
            async with _http().stream(
                "POST",
                f"{API}/models/{model}:streamGenerateContent?alt=sse",
                json=body,
                headers={"x-goog-api-key": keys[0]},
                timeout=httpx.Timeout(300, connect=20, read=STREAM_STALL_SECONDS),
            ) as r:
                if r.status_code != 200:
                    await r.aread()
                    text = r.text
                    if r.status_code == 429 and _is_daily_quota(r):
                        _mark_exhausted(keys[0], model)
                        continue
                    if r.status_code in (429, 500, 502, 503, 504) and attempt < 4:
                        await asyncio.sleep(min(30, 2 ** (attempt + 1)))
                        continue
                    raise GeminiError(f"Gemini request failed ({model}) {r.status_code}: {text[:300]}")
                async for line in r.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    chunk = json.loads(line[5:])
                    for cand in chunk.get("candidates", []):
                        for p in cand.get("content", {}).get("parts", []):
                            if p.get("text") and not p.get("thought"):
                                yield p["text"]
                return
        except httpx.HTTPError as e:
            raise GeminiError(f"Gemini stream interrupted ({model}): {type(e).__name__}") from e


async def embed(texts: list[str], *, query: bool, model: str | None = None) -> list[list[float]]:
    """Embeds texts. Task hints go in the text itself, as Google recommends for gemini-embedding-2."""
    s = get_settings()
    model = model or s.embed_model
    out: list[list[float]] = []
    batch: list[str] = []
    batch_tokens = 0

    async def flush() -> None:
        nonlocal batch, batch_tokens
        if not batch:
            return
        body = {
            "requests": [
                {"model": f"models/{model}", "content": {"parts": [{"text": t}]}, "outputDimensionality": s.embed_dims}
                for t in batch
            ]
        }
        data = await _post(model, "batchEmbedContents", body, tokens=batch_tokens, count=len(batch))
        out.extend(e["values"] for e in data["embeddings"])
        batch, batch_tokens = [], 0

    for t in texts:
        text = f"task: search result | query: {t}" if query else t
        tokens = len(text) // 3 + 1
        if batch and (len(batch) >= 20 or batch_tokens + tokens > 6000):
            await flush()
        batch.append(text)
        batch_tokens += tokens
    await flush()
    return out


def embed_models() -> list[str]:
    """Embedding models in order of preference; the fallback is used once the main one's daily quota is gone."""
    s = get_settings()
    return [m for m in (s.embed_model, s.embed_fallback_model) if m]
