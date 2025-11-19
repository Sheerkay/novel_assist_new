"""History conversation API endpoints."""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from marshmallow import ValidationError

from app.schemas.history import (
    history_conversation_create_schema,
    history_conversation_schema,
    history_conversations_schema,
)
from app.services import history_service

history_routes = Blueprint("history_routes", __name__)


@history_routes.route("/api/history", methods=["GET"])
def list_history():
    conversations = history_service.list_conversations()
    data = history_conversations_schema.dump(conversations)
    return jsonify(data)


@history_routes.route("/api/history", methods=["POST"])
def save_history():
    payload = request.get_json(force=True) or {}
    try:
        data = history_conversation_create_schema.load(payload)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400
    conversation = history_service.seed_conversation(
        title=data["title"],
        mode=data["mode"],
        messages=data["messages"],
    )
    return jsonify(history_conversation_schema.dump(conversation)), 201


@history_routes.route("/api/history", methods=["DELETE"])
def clear_history():
    history_service.clear_history()
    return jsonify({"message": "历史对话已清空"})
