"""Utilities for reading and updating chapter metadata on disk."""

from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Tuple

from flask import current_app

from app.core.chapters import split_chapters


class ChapterMetadataNotFoundError(FileNotFoundError):
    """Raised when the chapter metadata JSON cannot be located."""


class ChapterIndexError(IndexError):
    """Raised when a requested chapter index is out of bounds."""


def _analysis_dir() -> Path:
    upload_folder = Path(current_app.config["UPLOAD_FOLDER"])
    analysis_dir = upload_folder / "analysis"
    analysis_dir.mkdir(parents=True, exist_ok=True)
    return analysis_dir


def _chapters_path(file_id: str) -> Path:
    return _analysis_dir() / f"{file_id}_chapters.json"


def load_chapters_info(file_id: str) -> Dict[str, Any]:
    path = _chapters_path(file_id)
    if not path.exists():
        raise ChapterMetadataNotFoundError(f"找不到章节信息: {file_id}")
    return json.loads(path.read_text(encoding="utf-8"))


def save_chapters_info(file_id: str, data: Dict[str, Any]) -> None:
    path = _chapters_path(file_id)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def get_chapter(file_id: str, index: int) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    info = load_chapters_info(file_id)
    chapters = info.get("chapters", [])
    if not isinstance(index, int) or index < 0 or index >= len(chapters):
        raise ChapterIndexError(f"章节索引超出范围: {index}")
    return chapters[index], info


def get_chapter_content(file_id: str, index: int) -> str:
    chapter, _ = get_chapter(file_id, index)
    return chapter.get("content", "")


def update_chapter_content(file_id: str, index: int, content: str) -> Dict[str, Any]:
    chapter, info = get_chapter(file_id, index)
    chapter["content"] = content
    save_chapters_info(file_id, info)
    return info


def append_generated_content(file_id: str, content: str) -> Dict[str, Any]:
    """Append generated text to an existing generated novel and refresh chapter info."""

    info = load_chapters_info(file_id)
    if not info.get("is_generated"):
        raise ChapterMetadataNotFoundError(f"文件 {file_id} 不是生成作品，无法追加内容")

    upload_folder = Path(current_app.config["UPLOAD_FOLDER"])
    filename = info.get("filename", "")
    source_path = _resolve_generated_file_path(upload_folder, file_id, filename)
    if not source_path.exists():
        raise ChapterMetadataNotFoundError(f"找不到文件ID为 {file_id} 的原始生成文件")

    with source_path.open("a", encoding="utf-8") as handle:
        handle.write("\n\n" + content)

    full_content = source_path.read_text(encoding="utf-8")
    info["chapters"] = split_chapters(full_content)
    save_chapters_info(file_id, info)
    return info


def create_generated_record(
    content: str,
    *,
    prompt: str,
    chapters: List[Dict[str, Any]],
    target_chapters: int,
) -> Dict[str, Any]:
    """Persist a newly generated novel and return its metadata payload."""

    file_id = str(uuid.uuid4())
    timestamp = int(time.time())
    filename = f"创作_{timestamp}.txt"

    upload_folder = Path(current_app.config["UPLOAD_FOLDER"])
    generated_dir = upload_folder / "generated"
    generated_dir.mkdir(parents=True, exist_ok=True)
    filepath = generated_dir / f"{file_id}_{filename}"
    filepath.write_text(content, encoding="utf-8")

    info = {
        "file_id": file_id,
        "filename": filename,
        "chapters": chapters,
        "is_generated": True,
        "generation_prompt": prompt,
        "target_chapters": target_chapters,
    }
    save_chapters_info(file_id, info)
    return info


def _resolve_generated_file_path(base: Path, file_id: str, filename: str) -> Path:
    """Locate the source file for a generated novel."""

    ext = Path(filename).suffix
    novel_candidate = base / "novels" / f"{file_id}{ext}"
    generated_candidate = base / "generated" / f"{file_id}_{filename}"
    return novel_candidate if novel_candidate.exists() else generated_candidate