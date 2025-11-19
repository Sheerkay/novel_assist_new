from flask import Blueprint, jsonify
from pathlib import Path

from app.adapters.tools.base import ToolExecutionContext
from app.adapters.tools.fs_interaction.log_clear import build_tool as build_clear_tool
from app.adapters.tools.fs_interaction.log_reader import build_tool as build_read_tool

log_routes = Blueprint("log_routes", __name__)


BACKEND_LOG_DIR = Path(__file__).parent.parent.parent / "logs"
FRONTEND_LOG_FILE = Path(__file__).parent.parent.parent.parent / "frontend" / "logs" / "app.log"

_read_tool = build_read_tool(BACKEND_LOG_DIR, FRONTEND_LOG_FILE)
_clear_tool = build_clear_tool(BACKEND_LOG_DIR, FRONTEND_LOG_FILE)


@log_routes.route("/api/logs/<log_type>", methods=["GET"])
def get_logs(log_type):
    """获取日志内容"""
    try:
        context = ToolExecutionContext()
        result = _read_tool.run({"log_type": log_type}, context)
        return jsonify(result.output)
    except Exception as exc:  # pragma: no cover - runtime safeguard
        return jsonify({"error": str(exc)}), 500


@log_routes.route("/api/logs/<log_type>", methods=["DELETE"])
def clear_logs(log_type):
    """清空日志"""
    try:
        context = ToolExecutionContext()
        result = _clear_tool.run({"log_type": log_type}, context)
        return jsonify(result.output)
    except Exception as exc:  # pragma: no cover - runtime safeguard
        return jsonify({"error": str(exc)}), 500
