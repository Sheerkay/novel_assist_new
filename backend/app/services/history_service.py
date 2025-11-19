"""Service helpers to persist and retrieve conversation history."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from flask import current_app

_HISTORY_FILENAME = "history.json"


def _history_path() -> Path:
    upload_folder = Path(current_app.config["UPLOAD_FOLDER"])
    history_dir = upload_folder / "history"
    history_dir.mkdir(parents=True, exist_ok=True)
    return history_dir / _HISTORY_FILENAME


def _read_history() -> List[Dict[str, Any]]:
    path = _history_path()
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def list_conversations() -> List[Dict[str, Any]]:
    return _read_history()


def save_conversation(conversation: Dict[str, Any]) -> Dict[str, Any]:
    conversations = _read_history()
    conversations.append(conversation)
    _history_path().write_text(json.dumps(conversations, ensure_ascii=False, indent=2), encoding="utf-8")
    return conversation


def clear_history() -> None:
    path = _history_path()
    if path.exists():
        path.write_text("[]", encoding="utf-8")


def seed_conversation(title: str, mode: str, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    conversation = {
        "id": f"{int(datetime.utcnow().timestamp() * 1000)}",
        "title": title,
        "mode": mode,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "messages": messages,
    }
    return save_conversation(conversation)
