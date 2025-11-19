"""Service helpers for maintaining customizable text labels."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict

from flask import current_app


_DEFAULT_LABELS = {
    "chapters": "原文章节",
    "summaries": "剧情梗概",
    "currentChapterPlot": "当前原文章节剧情",
}


def _labels_path() -> Path:
    base_dir = Path(current_app.root_path).parent / "config"
    base_dir.mkdir(parents=True, exist_ok=True)
    return base_dir / "text_labels.json"


def _load_file() -> Dict[str, str]:
    path = _labels_path()
    if not path.exists():
        return _DEFAULT_LABELS.copy()
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return _DEFAULT_LABELS.copy()


def get_all() -> Dict[str, str]:
    data = _load_file()
    merged = _DEFAULT_LABELS.copy()
    merged.update({k: v for k, v in data.items() if isinstance(v, str)})
    return merged


def update(labels: Dict[str, str]) -> Dict[str, str]:
    current = get_all()
    for key, value in labels.items():
        if isinstance(value, str) and value.strip():
            current[key] = value.strip()
    _labels_path().write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8")
    return current
