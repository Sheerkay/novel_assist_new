"""High level planner responsible for breaking a request into executable steps."""

from __future__ import annotations

from typing import List

from .shared import PlannerPlan, PlannerRequest, PlanStep, ToolInvocation


class PlannerAgent:
    """Produces lightweight sequential plans that can be executed by the orchestrator."""

    def build_plan(self, request: PlannerRequest) -> PlannerPlan:
        """Derive an execution plan from the incoming request."""

        steps: List[PlanStep] = []

        if request.intent == "chat":
            steps.append(
                PlanStep(
                    description="生成普通对话回复",
                    tool=ToolInvocation(
                        name="conversation.general_chat",
                        payload={
                            "prompt": request.prompt,
                            "history": request.history,
                        },
                    ),
                )
            )
            return PlannerPlan(steps=steps)

        if request.intent == "chapter_summary":
            steps.append(
                PlanStep(
                    description="生成章节剧情概括",
                    tool=ToolInvocation(
                        name="analysis.chapter_summary",
                        payload={
                            "chapter_content": request.metadata.get("chapter_content", ""),
                            "title": request.metadata.get("title", ""),
                        },
                    ),
                )
            )
            return PlannerPlan(steps=steps)

        if request.intent == "chapter_process":
            steps.append(
                PlanStep(
                    description="根据提示词加工章节内容",
                    tool=ToolInvocation(
                        name="analysis.chapter_process",
                        payload={
                            "chapter_content": request.metadata.get("chapter_content", ""),
                            "instruction": request.metadata.get("instruction", ""),
                        },
                    ),
                )
            )
            return PlannerPlan(steps=steps)

        if request.intent == "character_analysis":
            steps.append(
                PlanStep(
                    description="分析章节人物信息",
                    tool=ToolInvocation(
                        name="analysis.character_analysis",
                        payload={
                            "chapter_content": request.metadata.get("chapter_content", ""),
                        },
                    ),
                )
            )
            return PlannerPlan(steps=steps)

        if request.intent == "bulk_chapter_summary":
            steps.append(
                PlanStep(
                    description="批量生成章节概括",
                    tool=ToolInvocation(
                        name="analysis.bulk_chapter_summary",
                        payload={
                            "chapters": request.metadata.get("chapters", []),
                        },
                    ),
                )
            )
            return PlannerPlan(steps=steps)

        if request.context:
            steps.append(
                PlanStep(
                    description="构建上下文快照",
                    delegate="context-agent",
                    params={
                        "intent": request.intent,
                        "prompt": request.prompt,
                        "context": request.context,
                        "metadata": request.metadata,
                    },
                )
            )

        steps.append(
            PlanStep(
                description="根据意图生成内容",
                tool=ToolInvocation(
                    name="content.generate",
                    payload={
                        "intent": request.intent,
                        "prompt": request.prompt,
                        "history": request.history,
                        "metadata": request.metadata,
                    },
                ),
            )
        )

        steps.append(
            PlanStep(
                description="拆分生成内容章节",
                tool=ToolInvocation(
                    name="content.split_chapters",
                    payload={},
                ),
            )
        )

        return PlannerPlan(steps=steps)
