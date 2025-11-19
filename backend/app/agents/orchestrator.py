"""Runtime orchestrator executing planner-produced steps."""

from __future__ import annotations

from typing import Dict, Iterable

from .context_agent import ContextAgent
from .planner import PlannerAgent
from .shared import PlannerRequest, PlannerResult, PlannerPlan, StepResult
from app.adapters.tools.base import (
    BaseTool,
    ToolExecutionContext,
    ToolRegistry,
    ToolResult,
)


class AgentOrchestrator:
    """Coordinates planner, tools and sub-agents to fulfil a request."""

    def __init__(
        self,
        planner: PlannerAgent,
        context_agent: ContextAgent,
        tools: Iterable[BaseTool],
    ) -> None:
        self._planner = planner
        self._context_agent = context_agent
        self._registry = ToolRegistry()
        for tool in tools:
            self._registry.register(tool)

    def _execute_plan(self, plan: PlannerPlan, request: PlannerRequest) -> PlannerResult:
        execution_context = ToolExecutionContext()
        step_results: list[StepResult] = []

        for step in plan.steps:
            if step.delegate == "context-agent":
                ctx_payload = step.params.copy()
                context_data = self._context_agent.prepare_context(
                    intent=ctx_payload.get("intent") or request.intent,
                    context=ctx_payload.get("context") or request.context,
                    metadata=ctx_payload.get("metadata") or request.metadata,
                )
                execution_context.artifacts.update(context_data)
                step_results.append(
                    StepResult(
                        step=step,
                        output={"snapshot": context_data.get("snapshot")},
                    )
                )
                continue

            if not step.tool:
                continue

            tool = self._registry.get(step.tool.name)
            payload = step.tool.payload.copy()

            # Provide context manager to downstream tools if available
            if "context_manager" in execution_context.artifacts:
                payload.setdefault(
                    "context_manager",
                    execution_context.artifacts["context_manager"],
                )

            result: ToolResult = tool.run(payload, execution_context)
            execution_context.artifacts.update(result.artifacts)
            step_results.append(StepResult(step=step, output=result.output))

        return PlannerResult(steps=step_results, artifacts=execution_context.artifacts)

    def run(self, request: PlannerRequest) -> PlannerResult:
        plan = self._planner.build_plan(request)
        return self._execute_plan(plan, request)
