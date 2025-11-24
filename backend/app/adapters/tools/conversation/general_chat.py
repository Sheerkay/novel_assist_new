"""Tool that handles lightweight conversational queries."""

from __future__ import annotations

from typing import Any, Dict

from app.prompts.prompt_manager import get_system_prompt
from app.services.llm_client import call_chat_completion

from ..base import BaseTool, ToolExecutionContext, ToolResult


class GeneralChatTool:
    name = "conversation.general_chat"
    description = "处理闲聊类对话"

    def run(self, payload: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        prompt = payload.get("prompt", "")
        history = payload.get("history", [])
        system_prompt = get_system_prompt("general_chat_system")
        messages = [
            {"role": "system", "content": system_prompt},
        ]
        
        if history:
            for msg in history:
                role = msg.get('role')
                content = msg.get('content')
                if role and content:
                    messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": prompt})
        
        response = call_chat_completion(messages, temperature=0.7, max_tokens=2000)
        if response and response.get("choices"):
            content = response["choices"][0]["message"]["content"]
        else:
            content = "抱歉，我现在无法回复。请稍后再试。"
        return ToolResult(output={"content": content})


def build_tool() -> BaseTool:
    return GeneralChatTool()
