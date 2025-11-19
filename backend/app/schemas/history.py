"""Schemas describing history conversation payloads."""

from __future__ import annotations

from marshmallow import fields

from . import ma


class HistoryMessageSchema(ma.Schema):
    role = fields.String(required=True)
    content = fields.String(required=True)
    timestamp = fields.String(required=False)


class HistoryConversationSchema(ma.Schema):
    id = fields.String(required=True)
    title = fields.String(required=True)
    mode = fields.String(required=True)
    created_at = fields.String(required=True)
    messages = fields.List(fields.Nested(HistoryMessageSchema), required=True)


class HistoryConversationCreateSchema(ma.Schema):
    title = fields.String(required=True)
    mode = fields.String(required=True)
    messages = fields.List(fields.Nested(HistoryMessageSchema), required=True)


history_message_schema = HistoryMessageSchema()
history_conversation_schema = HistoryConversationSchema()
history_conversations_schema = HistoryConversationSchema(many=True)
history_conversation_create_schema = HistoryConversationCreateSchema()
