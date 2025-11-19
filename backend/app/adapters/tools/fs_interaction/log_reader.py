"""Tools for interacting with log files on disk."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from ..base import BaseTool, ToolExecutionContext, ToolResult


class LogReadTool:
    name = "fs.logs.read"
    description = "读取最新的日志文件"

    def __init__(self, backend_dir: Path, frontend_log: Path) -> None:
        self._backend_dir = backend_dir
        self._frontend_log = frontend_log

    def run(self, payload: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        log_type = payload.get("log_type", "backend")
        if log_type == "frontend":
            if self._frontend_log.exists():
                content = self._frontend_log.read_text(encoding="utf-8")
            else:
                content = "前端日志文件不存在"
            return ToolResult(output={"content": content, "type": "frontend"})

        log_files = list(self._backend_dir.glob("*.log"))
        if not log_files:
            return ToolResult(output={"content": "后端日志文件不存在", "type": "backend"})
        latest_log = max(log_files, key=lambda f: f.stat().st_mtime)
        lines = latest_log.read_text(encoding="utf-8").splitlines()
        content = "\n".join(lines[-10000:])
        return ToolResult(
            output={
                "content": content,
                "type": "backend",
                "file": latest_log.name,
            }
        )


def build_tool(backend_dir: Path, frontend_log: Path) -> BaseTool:
    return LogReadTool(backend_dir, frontend_log)
