"""Tool that summarizes multiple chapters in one orchestrated call."""

from __future__ import annotations

from typing import Any, Dict, List

from app.services import ai_service

from ..base import BaseTool, ToolExecutionContext, ToolResult


class BulkChapterSummaryTool:
    name = "analysis.bulk_chapter_summary"
    description = "生成多个章节的剧情概括"

    def run(self, payload: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        chapters: List[Dict[str, Any]] = payload.get("chapters", [])
        summaries: List[Dict[str, Any]] = []

        for index, chapter in enumerate(chapters, start=1):
            content = chapter.get("content", "")
            title = chapter.get("title", f"章节 {index}")
            summary = ai_service.generate_chapter_summary(content, title=title)
            summaries.append(
                {
                    "title": title,
                    "summary": summary or "[本章概括生成失败]",
                    "success": bool(summary),
                    "length": len(content),
                }
            )

        combined_output = []
        for item in summaries:
            combined_output.append(f"## {item['title']} - 剧情概括\n{item['summary']}")
        return ToolResult(
            output={
                "summaries": summaries,
                "content": "\n\n".join(combined_output).strip(),
            },
            artifacts={
                "summaries": summaries,
                "generated_content": "\n\n".join(combined_output).strip(),
            },
        )


def build_tool() -> BaseTool:
    return BulkChapterSummaryTool()
