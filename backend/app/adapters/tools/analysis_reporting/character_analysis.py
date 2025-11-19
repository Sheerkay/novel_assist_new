"""Tool that analyzes characters within a chapter."""

from __future__ import annotations

import json
from typing import Any, Dict, List

from app.prompts.prompt_manager import get_prompt, get_system_prompt
from app.services.llm_client import LLMClientError, call_chat_completion
from app.utils.logger import log_ai_call

from ..base import BaseTool, ToolExecutionContext, ToolResult


class CharacterAnalysisTool:
    name = "analysis.character_analysis"
    description = "从章节内容中提取主要角色及其信息"

    def run(self, payload: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        chapter_content = payload.get("chapter_content", "")
        if not chapter_content:
            return ToolResult(output={"characters": []})

        prompt_template = get_prompt("analyze_characters")
        if not prompt_template:
            return ToolResult(
                output={
                    "characters": [
                        {
                            "name": "错误",
                            "description": "无法加载分析人物的提示词模板。",
                            "actions": [],
                        }
                    ]
                }
            )

        prompt = prompt_template.format(chapter_content=chapter_content[:4000])
        system_prompt = get_system_prompt("analyze_characters_system")
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]

        log_ai_call(
            prompt_type="章节人物分析",
            prompt=f"System: {system_prompt}\n\nUser: {prompt}",
        )

        try:
            response = call_chat_completion(messages, temperature=0.3, max_tokens=2000)
        except LLMClientError as exc:
            log_ai_call(prompt_type="章节人物分析", prompt="", error=str(exc))
            return ToolResult(
                output={
                    "characters": [
                        {
                            "name": "错误",
                            "description": "分析服务暂时不可用，请稍后重试。",
                            "actions": [],
                        }
                    ]
                }
            )

        characters: List[Dict[str, Any]]
        if response and response.get("choices"):
            content = response["choices"][0]["message"]["content"]
            log_ai_call(prompt_type="章节人物分析", prompt="", response=content)
            characters = self._parse_response(content)
        else:
            log_ai_call(
                prompt_type="章节人物分析",
                prompt="",
                error="AI响应为空或格式不正确。",
            )
            characters = [
                {
                    "name": "未知人物",
                    "description": "人物分析失败，请重试",
                    "actions": ["无法获取行动信息"],
                }
            ]

        artifacts = {"characters": characters}
        return ToolResult(output={"characters": characters}, artifacts=artifacts)

    def _parse_response(self, content: str) -> List[Dict[str, Any]]:
        try:
            json_match = self._extract_json(content)
            if json_match:
                return json.loads(json_match)
        except json.JSONDecodeError:
            pass
        return [
            {
                "name": "未知人物",
                "description": "人物分析结果解析失败",
                "actions": ["无法获取行动信息"],
            }
        ]

    def _extract_json(self, text: str) -> str | None:
        import re

        match = re.search(r"```json\s*([\s\S]*?)\s*```", text)
        if match:
            return match.group(1)
        if text.strip().startswith("["):
            return text.strip()
        return None


def build_tool() -> BaseTool:
    return CharacterAnalysisTool()
