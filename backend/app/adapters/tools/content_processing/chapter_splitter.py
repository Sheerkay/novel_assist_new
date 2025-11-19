"""Tool for splitting raw narrative content into structured chapters."""

from __future__ import annotations

from typing import Any, Dict

from app.core.chapters import split_chapters

from ..base import BaseTool, ToolExecutionContext, ToolResult


class ChapterSplitterTool:
    name = "content.split_chapters"
    description = "根据启发式规则拆分章节"

    def run(self, payload: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        text: str = payload.get("text") or context.artifacts.get("generated_content", "")
        chapters = split_chapters(text)
        return ToolResult(
            output={"chapters": chapters},
            artifacts={"chapters": chapters},
        )


def build_tool() -> BaseTool:
    return ChapterSplitterTool()
