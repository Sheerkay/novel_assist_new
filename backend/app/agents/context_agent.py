"""Sub-agent dedicated to complex context preparation tasks."""

from __future__ import annotations

from typing import Any, Dict

from app.core.context import ContextManager


class ContextAgent:
    """Handles construction and maintenance of authoring context."""

    def prepare_context(self, *, intent: str, context: str, metadata: Dict[str, Any] | None = None) -> Dict[str, Any]:
        metadata = metadata or {}
        context_manager = ContextManager()
        context_chapters = metadata.get("context_chapters", [])
        context_manager.set_additional_context(context, context_chapters)
        snapshot = context_manager.get_context_for_intent(intent)
        return {
            "context_manager": context_manager,
            "snapshot": {
                "has_context": snapshot.has_context,
                "context": snapshot.context,
                "context_chapter_list": snapshot.context_chapter_list,
            },
        }
