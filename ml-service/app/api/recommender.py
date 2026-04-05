from __future__ import annotations

from fastapi import APIRouter

from app.inference.recommend_courses import recommend_courses_payload
from app.schemas.jobs import (
    CourseRecommendationRequest,
    CourseRecommendationResponse,
)


router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("/courses", response_model=CourseRecommendationResponse)
def recommend_courses(request: CourseRecommendationRequest) -> CourseRecommendationResponse:
    return recommend_courses_payload(
        target_role=request.target_role,
        user_skills=request.user_skills,
        missing_skills=request.missing_skills,
    )
