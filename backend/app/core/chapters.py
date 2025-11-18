"""Utilities for working with chapters extracted from raw manuscripts."""
from __future__ import annotations

import re
from enum import Enum, auto
from typing import Iterable, List, Dict, Any

__all__ = ["split_chapters", "allowed_file"]


class PatternType(Enum):
    """Heuristics used to detect chapter headings."""

    CHINESE_NUMERIC = auto()
    ARABIC_NUMERIC = auto()
    ENGLISH = auto()
    UNKNOWN = auto()


CHINESE_NUM_MAP = {
    "零": 0,
    "一": 1,
    "二": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
    "十": 10,
    "百": 100,
    "千": 1000,
    "万": 10000,
}


def _chinese_to_arabic(cn_num: str) -> int:
    if not cn_num:
        return 0
    if cn_num.isdigit():
        return int(cn_num)
    total = 0
    unit = 1
    temp_val = 0
    for char in reversed(cn_num):
        val = CHINESE_NUM_MAP.get(char)
        if val is None:
            continue
        if val >= 10:
            if val > unit:
                unit = val
            else:
                unit *= val
        else:
            temp_val += val * unit
    total += temp_val
    return total


def _extract_chapter_number(title_line: str) -> int | None:
    match = re.search(r"^第([一二三四五六七八九十零百千万\d]+)[章节卷集篇]", title_line)
    if match:
        return _chinese_to_arabic(match.group(1))
    match = re.search(r"^(Chapter|CHAPTER)\s*(\d+)", title_line)
    if match:
        return int(match.group(2))
    match = re.search(r"^(\d+)", title_line)
    if match:
        return int(match.group(1))
    return None


def split_chapters(text: str) -> List[Dict[str, Any]]:
    """Best-effort chapter segmentation used across ingestion and generation."""

    chapters: List[Dict[str, Any]] = []
    if not text or not text.strip():
        return chapters

    last_pattern_type = PatternType.UNKNOWN
    last_chapter_number = 0

    chapter_patterns: Iterable[tuple[PatternType, str]] = (
        (PatternType.CHINESE_NUMERIC, r"^第[一二三四五六七八九十零百千万\d]+[章节卷集篇]\s*.*$"),
        (PatternType.ENGLISH, r"^(Chapter|CHAPTER)\s+\d+\s*.*$"),
        (PatternType.ARABIC_NUMERIC, r"^\d+\s*.*$"),
    )

    def is_valid_title_in_context(line: str, potential_type: PatternType) -> bool:
        nonlocal last_pattern_type, last_chapter_number

        if potential_type in (PatternType.CHINESE_NUMERIC, PatternType.ENGLISH):
            return True
        if potential_type == PatternType.ARABIC_NUMERIC:
            if re.match(r"^\d+\.\s", line):
                return False
            if len(line) > 60 or "，" in line or "。" in line:
                return False
            current_number = _extract_chapter_number(line)
            if current_number is None:
                return False
            if last_chapter_number == 0 and current_number == 1:
                return True
            diff = current_number - last_chapter_number
            return 0 < diff < 5
        return False

    lines = text.split("\n")
    current_chapter: Dict[str, Any] | None = None

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            if current_chapter is not None:
                current_chapter["content"] += "\n"
            continue

        is_chapter_title = False
        matched_pattern_type = PatternType.UNKNOWN

        for p_type, pattern in chapter_patterns:
            if re.match(pattern, line):
                if is_valid_title_in_context(line, p_type):
                    is_chapter_title = True
                    matched_pattern_type = p_type
                    break

        if is_chapter_title:
            if current_chapter:
                chapters.append(current_chapter)
            current_number = _extract_chapter_number(line) or (last_chapter_number + 1)
            current_chapter = {"title": line, "content": "", "number": current_number}
            last_pattern_type = matched_pattern_type
            last_chapter_number = current_number
        else:
            if current_chapter is None:
                current_chapter = {"title": "前言", "content": "", "number": 0}
            current_chapter["content"] += line + "\n"

    if current_chapter:
        chapters.append(current_chapter)

    if not chapters and text.strip():
        chapters = [{"title": "全文", "content": text, "number": 1}]

    return chapters


def allowed_file(filename: str, allowed_extensions: Iterable[str]) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in set(allowed_extensions or [])
