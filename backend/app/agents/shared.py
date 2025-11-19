"""Shared data structures used by the agent orchestration layer."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PlannerRequest(BaseModel):
    """Input contract describing the user request that needs orchestration."""

    intent: str = Field(..., description="High level intent inferred from the user prompt")
    prompt: str = Field(..., description="Raw user prompt")
    context: str = Field("", description="Flattened contextual text snippets")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Arbitrary metadata")


class ToolInvocation(BaseModel):
    """Describes a single tool call within a plan step."""

    name: str = Field(..., description="Unique tool identifier registered with the orchestrator")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Input payload passed to the tool")


class PlanStep(BaseModel):
    """A single unit of work that can be executed by a tool or delegated to a sub-agent."""

    description: str = Field(..., description="Human readable description of the step")
    tool: Optional[ToolInvocation] = Field(None, description="Tool invocation details if the step is tool-driven")
    delegate: Optional[str] = Field(
        None,
        description="Optional identifier for a sub-agent responsible for the step",
    )
    params: Dict[str, Any] = Field(default_factory=dict, description="Parameters for the delegate agent")


class PlannerPlan(BaseModel):
    """An executable plan composed of sequential steps."""

    steps: List[PlanStep] = Field(default_factory=list)


class StepResult(BaseModel):
    """Normalized result emitted by a plan step."""

    step: PlanStep
    output: Dict[str, Any] = Field(default_factory=dict)


class PlannerResult(BaseModel):
    """Aggregated output of the orchestrated run."""

    steps: List[StepResult] = Field(default_factory=list)
    artifacts: Dict[str, Any] = Field(default_factory=dict)
