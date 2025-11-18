"""Compatibility module forwarding to the new core context package."""

from app.core.context import ContextManager, create_context_manager

__all__ = ["ContextManager", "get_context_manager"]


_global_context_manager = create_context_manager()


def get_context_manager():
    """Preserve the historical singleton accessor."""

    return _global_context_manager
