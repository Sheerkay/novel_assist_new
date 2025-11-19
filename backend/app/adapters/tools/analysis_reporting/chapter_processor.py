"""Tool to process a chapter based on a user supplied instruction."""

from __future__ import annotations

from typing import Any, Dict

from app.prompts.prompt_manager import get_prompt, get_system_prompt
from app.services.llm_client import LLMClientError, call_chat_completion
from app.utils.logger import log_ai_call

from ..base import BaseTool, ToolExecutionContext, ToolResult


class ChapterProcessorTool:
    name = "analysis.chapter_process"
    description = "根据提示词对章节内容进行加工"

    def run(self, payload: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        chapter_content = payload.get("chapter_content", "")
        instruction = payload.get("instruction", "")

        prompt_template = get_prompt("process_chapter")
        if not prompt_template:
            return ToolResult(output={"result": "错误：无法加载处理章节的提示词模板。"})

        prompt = prompt_template.format(
            chapter_content=chapter_content[:3000],
            user_prompt=instruction,
        )
        system_prompt = get_system_prompt("process_chapter_system")
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]

        log_ai_call(
            prompt_type="章节加工",
            prompt=f"System: {system_prompt}\n\nUser: {prompt}",
        )

        try:
            response = call_chat_completion(messages, temperature=0.7, max_tokens=4000)
        except LLMClientError as exc:
            log_ai_call(prompt_type="章节加工", prompt="", error=str(exc))
            return ToolResult(output={"result": f"处理失败: {exc}"})

        if response and response.get("choices"):
            result_text = response["choices"][0]["message"]["content"]
            log_ai_call(prompt_type="章节加工", prompt="", response=result_text)
        else:
            result_text = "AI响应为空或格式不正确。"
            log_ai_call(prompt_type="章节加工", prompt="", error=result_text)

        artifacts = {
            "processed_chapter": result_text,
            "result": result_text,
        }
        return ToolResult(output={"result": result_text, "content": result_text}, artifacts=artifacts)


def build_tool() -> BaseTool:
    return ChapterProcessorTool()
