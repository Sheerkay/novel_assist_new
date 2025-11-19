"""Thin wrapper around the DeepSeek chat completion API."""

from __future__ import annotations

from typing import Any, Dict, List

import requests
from flask import current_app


class LLMClientError(RuntimeError):
    """Raised when the upstream LLM request fails."""


def call_chat_completion(
    messages: List[Dict[str, str]],
    *,
    temperature: float = 0.7,
    max_tokens: int = 4000,
    model: str = "deepseek-chat",
) -> Dict[str, Any]:
    api_key = current_app.config.get("DEEPSEEK_API_KEY")
    if not api_key:
        raise LLMClientError("DEEPSEEK_API_KEY 未在配置中设置")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        response = requests.post(
            "https://api.deepseek.com/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as exc:  # pragma: no cover - network
        detail = getattr(exc.response, "text", str(exc))
        raise LLMClientError(f"DeepSeek API调用错误: {detail}") from exc
