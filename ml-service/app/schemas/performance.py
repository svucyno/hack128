from __future__ import annotations

from pydantic import BaseModel, Field


class PerformancePredictRequest(BaseModel):
    cgpa: float = Field(0, ge=0, le=10)
    skills_count: int = Field(0, ge=0)
    projects_count: int = Field(0, ge=0)
    mock_interview_avg: float = Field(0, ge=0, le=100)
    ats_score: float = Field(0, ge=0, le=100)
    streak: int = Field(0, ge=0)


class PerformancePredictResponse(BaseModel):
    placement_probability: float
    risk_level: str
    confidence: float
    top_factors: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
