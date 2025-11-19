"""Tool responsible for generating chapter summaries."""

from __future__ import annotations

from typing import Any, Dict

from app.prompts.prompt_manager import get_prompt, get_system_prompt
from app.services.llm_client import call_chat_completion
from app.utils.logger import log_ai_call

from ..base import BaseTool, ToolExecutionContext, ToolResult


class ChapterSummaryTool:
    name = "analysis.chapter_summary"
    description = "为章节生成剧情概括"

    def run(self, payload: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        chapter_content = payload.get("chapter_content", "")
        chapter_title = payload.get("title", "")
        prompt_template = get_prompt("summarize_chapter")
        if not prompt_template:
            return ToolResult(output={"summary": "错误：无法加载生成章节摘要的提示词模板。"})
        prompt = prompt_template.format(chapter_content=chapter_content[:4000])
        system_prompt = get_system_prompt("summarize_chapter_system")
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]
        log_ai_call(
            prompt_type="章节概括",
            prompt=f"System: {system_prompt}\n\nUser: {prompt}",
        )
        response = call_chat_completion(messages, temperature=0.3, max_tokens=1500)
        if response and response.get("choices"):
            summary = response["choices"][0]["message"]["content"]
            log_ai_call(prompt_type="章节概括", prompt="", response=summary)
        else:
            summary = "AI响应为空或格式不正确。"
            log_ai_call(prompt_type="章节概括", prompt="", error=summary)

        artifacts = {
            "generated_content": summary,
            "summary": summary,
        }
        if chapter_title:
            artifacts["chapter_title"] = chapter_title

        return ToolResult(
            output={"summary": summary, "content": summary},
            artifacts=artifacts,
        )


def build_tool() -> BaseTool:
    return ChapterSummaryTool()
