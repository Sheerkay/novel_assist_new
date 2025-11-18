"""Context management primitives used across the application."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Dict, Any


@dataclass
class ContextChapter:
    """Lightweight representation of a chapter in the context list."""

    title: str
    number: Any = None


@dataclass
class ContextSnapshot:
    """Materialized view returned to prompt templates."""

    has_context: bool
    context: str
    context_chapter_list: str


class ContextManager:
    """Aggregates narrative context for downstream model invocations."""

    def __init__(self) -> None:
        self.additional_context: str = ""
        self.context_chapters: List[Dict[str, Any]] = []
        self.conversation_history: List[Dict[str, Any]] = []  # reserved for future use

    def set_additional_context(
        self,
        context_string: str,
        context_chapters: List[Dict[str, Any]] | None = None,
    ) -> None:
        """Persist formatted context snippets for later prompt construction."""

        self.additional_context = context_string or ""
        self.context_chapters = list(context_chapters or [])

    def get_context_for_intent(self, intent: str) -> ContextSnapshot:
        """Return context metadata tuned to a specific authoring intent."""

        if intent == "chat":
            return ContextSnapshot(False, "", "")

        return ContextSnapshot(
            has_context=bool(self.additional_context),
            context=self.additional_context,
            context_chapter_list=self._format_chapter_list(),
        )

    def build_messages(
        self,
        intent: str,
        user_prompt: str,
        system_prompt_name: str,
        template_name: str | None,
    ) -> List[Dict[str, str]]:
        """Compose the conversation history delivered to the LLM."""

        from app.prompts.prompt_manager import get_system_prompt, get_prompt

        system_prompt = get_system_prompt(system_prompt_name)

        if template_name:
            context_snapshot = self.get_context_for_intent(intent)
            template = get_prompt(template_name)
            if template:
                user_message = template.format(
                    context=context_snapshot.context,
                    context_chapter_list=context_snapshot.context_chapter_list,
                    prompt=user_prompt,
                )
            else:
                user_message = user_prompt
        else:
            user_message = user_prompt

        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]

    def clear(self) -> None:
        """Reset all cached context information."""

        self.additional_context = ""
        self.context_chapters = []
        self.conversation_history = []

    def _format_chapter_list(self) -> str:
        if not self.context_chapters:
            return "无"

        lines = []
        for chapter in self.context_chapters:
            number = chapter.get("number", "N/A")
            title = chapter.get("title", "无标题")
            lines.append(f"- 章节 {number}: {title}")
        return "\n".join(lines)


def create_context_manager() -> ContextManager:
    """Factory helper to mirror the previous global accessor."""

    return ContextManager()
