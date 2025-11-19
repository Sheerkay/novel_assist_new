"""Integration layer for exposing core capabilities as callable tools."""

from __future__ import annotations

from .analysis_reporting.bulk_chapter_summary import build_tool as build_bulk_chapter_summary
from .analysis_reporting.character_analysis import build_tool as build_character_analysis
from .analysis_reporting.content_generator import build_tool as build_content_generator
from .analysis_reporting.chapter_processor import build_tool as build_chapter_processor
from .analysis_reporting.chapter_summary import build_tool as build_chapter_summary
from .content_processing.chapter_splitter import build_tool as build_chapter_splitter
from .conversation.general_chat import build_tool as build_general_chat


def load_default_toolset():
    """Return the canonical set of tools used by the orchestrator."""

    return [
        build_content_generator(),
        build_chapter_splitter(),
        build_general_chat(),
        build_chapter_summary(),
        build_chapter_processor(),
        build_character_analysis(),
        build_bulk_chapter_summary(),
    ]
