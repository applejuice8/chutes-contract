from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class RiskLevel(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class OverallRisk(StrEnum):
    GREEN = "GREEN"
    AMBER = "AMBER"
    RED = "RED"


class ContractType(StrEnum):
    NDA = "NDA"
    EMPLOYMENT = "Employment"
    VENDOR = "Vendor"
    LEASE = "Lease"


class PipelineStatus(StrEnum):
    COMPLETE = "complete"
    PROCESSING = "processing"
    PENDING = "pending"
    FAILED = "failed"


class ClauseAnalysis(BaseModel):
    id: str
    category: str
    text: str
    riskLevel: RiskLevel
    riskReason: str
    plainEnglish: str
    suggestedRewrite: str


class PipelineStage(BaseModel):
    stageNumber: int
    agentName: str
    description: str
    status: PipelineStatus = PipelineStatus.COMPLETE
    output: dict[str, Any] = Field(default_factory=dict)


class ContractAnalysis(BaseModel):
    id: UUID
    userId: str | None = None
    name: str
    date: str
    contractType: ContractType
    overallRisk: OverallRisk
    summary: str
    clauses: list[ClauseAnalysis]
    pipelineStages: list[PipelineStage]
    createdAt: datetime
    updatedAt: datetime


class ContractListItem(BaseModel):
    id: UUID
    name: str
    date: str
    contractType: ContractType
    overallRisk: OverallRisk
    summary: str
    clauseCount: int
    highRiskCount: int
    createdAt: datetime


class AnalyzeResponse(BaseModel):
    contract: ContractAnalysis
