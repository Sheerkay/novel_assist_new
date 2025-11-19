"""Base contracts and registry helpers for agent tools."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Protocol


@dataclass
class ToolExecutionContext:
    """Mutable execution scope shared across tools during a single run."""

    artifacts: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolResult:
    """Standardized result returned by tools."""

    output: Dict[str, Any] = field(default_factory=dict)
    artifacts: Dict[str, Any] = field(default_factory=dict)


class BaseTool(Protocol):
    """Protocol implemented by every concrete tool."""

    name: str
    description: str

    def run(self, payload: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        ...


class ToolRegistry:
    """Simple registry used by the orchestrator to resolve tools by name."""

    def __init__(self) -> None:
        self._tools: Dict[str, BaseTool] = {}

    def register(self, tool: BaseTool) -> None:
        self._tools[tool.name] = tool

    def get(self, name: str) -> BaseTool:
        if name not in self._tools:
            raise KeyError(f"Tool '{name}' is not registered")
        return self._tools[name]

    def values(self):
        return self._tools.values()
