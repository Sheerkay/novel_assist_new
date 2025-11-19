"""Tool to clear log files on disk."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from ..base import BaseTool, ToolExecutionContext, ToolResult


class LogClearTool:
    name = "fs.logs.clear"
    description = "清空日志文件"

    def __init__(self, backend_dir: Path, frontend_log: Path) -> None:
        self._backend_dir = backend_dir
        self._frontend_log = frontend_log

    def run(self, payload: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        log_type = payload.get("log_type", "backend")
        if log_type == "frontend":
            if self._frontend_log.exists():
                self._frontend_log.write_text("", encoding="utf-8")
                message = "前端日志已清空"
            else:
                message = "前端日志文件不存在"
            return ToolResult(output={"message": message})

        log_files = list(self._backend_dir.glob("*.log"))
        for log_file in log_files:
            log_file.write_text("", encoding="utf-8")
        return ToolResult(output={"message": f"已清空 {len(log_files)} 个后端日志文件"})


def build_tool(backend_dir: Path, frontend_log: Path) -> BaseTool:
    return LogClearTool(backend_dir, frontend_log)
