from __future__ import annotations

from pydantic import BaseModel, Field


class JobMatchRequest(BaseModel):
    resume_text: str = Field(..., min_length=1)
    target_roles: list[str] = Field(default_factory=list)
    location: str = ""


class JobMatchItem(BaseModel):
    job_id: str
    company: str
    role: str
    location: str
    work_mode: str = ""
    match_score: float
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    why_fit: list[str] = Field(default_factory=list)


class JobMatchResponse(BaseModel):
    matches: list[JobMatchItem] = Field(default_factory=list)


class CourseRecommendationRequest(BaseModel):
    target_role: str = ""
    user_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)


class CourseRecommendationItem(BaseModel):
    title: str
    provider: str
    level: str
    skills: list[str] = Field(default_factory=list)
    recommendation_score: float
    reason: str


class CourseRecommendationResponse(BaseModel):
    recommendations: list[CourseRecommendationItem] = Field(default_factory=list)
