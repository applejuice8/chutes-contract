from __future__ import annotations

import json
from typing import Any

import httpx

from app.config import Settings


class ChutesClient:
    def __init__(self, settings: Settings):
        if not settings.chutes_api_key:
            raise RuntimeError("CHUTES_API_KEY is required")
        if not settings.chutes_model:
            raise RuntimeError("CHUTES_MODEL is required")

        self._api_key = settings.chutes_api_key
        self._base_url = settings.chutes_base_url.rstrip("/")
        self._model = settings.chutes_model
        self._timeout = settings.chutes_timeout_seconds

    async def json_chat(
        self,
        *,
        system: str,
        user: str,
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        payload = {
            "model": self._model,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                f"{self._base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()

        content = response.json()["choices"][0]["message"]["content"]
        return _load_json(content)


def _load_json(content: str) -> dict[str, Any]:
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        parsed = json.loads(content[start : end + 1])

    if not isinstance(parsed, dict):
        raise ValueError("Chutes response must be a JSON object")
    return parsed
