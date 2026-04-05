from __future__ import annotations

from pydantic import BaseModel, Field


class RolePredictRequest(BaseModel):
    skills: list[str] = Field(default_factory=list)
    education: str = ""
    interests: list[str] = Field(default_factory=list)


class RolePredictionItem(BaseModel):
    role: str
    score: float


class RolePredictResponse(BaseModel):
    predictions: list[RolePredictionItem] = Field(default_factory=list)
    top_role: str = ""
    explanation: list[str] = Field(default_factory=list)


class SkillGapRequest(BaseModel):
    user_skills: list[str] = Field(default_factory=list)
    target_role: str = Field(..., min_length=1)


class SkillGapResponse(BaseModel):
    target_role: str
    required_skills: list[str] = Field(default_factory=list)
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    gap_score: float
    priority_skills: list[str] = Field(default_factory=list)
