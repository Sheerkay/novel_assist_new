"""Tool responsible for orchestrating content generation via DeepSeek."""

from __future__ import annotations

from typing import Any, Dict

from app.core.context import ContextManager
from app.prompts.prompt_manager import get_prompt, get_system_prompt
from app.services.llm_client import call_chat_completion
from app.utils.logger import ai_logger, log_ai_call

from ..base import BaseTool, ToolExecutionContext, ToolResult


class ContentGenerationTool:
    name = "content.generate"
    description = "根据上下文生成小说或剧情内容"

    def _resolve_context_manager(
        self,
        payload: Dict[str, Any],
        context: ToolExecutionContext,
    ) -> ContextManager:
        context_manager = payload.get("context_manager")
        if isinstance(context_manager, ContextManager):
            return context_manager
        if "context_manager" in context.artifacts and isinstance(
            context.artifacts["context_manager"],
            ContextManager,
        ):
            return context.artifacts["context_manager"]
        return ContextManager()

    def run(self, payload: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        intent = payload.get("intent", "default")
        user_prompt = payload.get("prompt", "")
        metadata = payload.get("metadata", {})

        context_manager = self._resolve_context_manager(payload, context)
        metadata = payload.get("metadata") or {}

        intent_config = {
            "plot_design": {
                "template": "plot_design",
                "system": "plot_design_system",
                "temperature": 0.5,
            },
            "novel_generation": {
                "template": "novel_generation",
                "system": "novel_generation_system",
                "temperature": 0.7,
            },
            "chapter_summary": {
                "template": "summarize_chapter",
                "system": "summarize_chapter_system",
                "temperature": 0.3,
            },
            "default": {
                "template": "general_content",
                "system": "generate_novel_system",
                "temperature": 0.7,
            },
        }

        config = intent_config.get(intent, intent_config["default"])
        ai_logger.info(
            f"🎯 使用配置: 意图={intent}, 模板={config['template']}, 系统提示={config['system']}, 温度={config['temperature']}"
        )

        messages = context_manager.build_messages(
            intent=intent,
            user_prompt=user_prompt,
            system_prompt_name=config["system"],
            template_name=config["template"],
        )

        full_prompt = "\n\n".join([f"[{msg['role']}]\n{msg['content']}" for msg in messages])
        log_ai_call(prompt_type=f"内容生成-{intent}", prompt=full_prompt)

        response = call_chat_completion(
            messages,
            temperature=config["temperature"],
            max_tokens=4000,
        )

        if not response or "choices" not in response or not response["choices"]:
            ai_logger.error("❌ API调用失败或返回为空")
            log_ai_call(
                prompt_type=f"内容生成-{intent}",
                prompt="",
                error="API响应为空或格式不正确",
            )
            return ToolResult(output={"content": "AI响应为空或格式不正确。"})

        result = response["choices"][0]["message"]["content"]
        ai_logger.info(f"✅ API调用成功，返回内容长度: {len(result)} 字符")
        log_ai_call(prompt_type=f"内容生成-{intent}", prompt="", response=result)

        snippets = {
            "generated_content": result,
            "context_manager": context_manager,
            "intent": intent,
            "metadata": metadata,
        }
        context.artifacts.update(snippets)
        return ToolResult(output={"content": result}, artifacts=snippets)


def build_tool() -> BaseTool:
    return ContentGenerationTool()
