from __future__ import annotations

from fastapi import APIRouter

from app.inference.predict_performance import predict_performance_payload
from app.schemas.performance import PerformancePredictRequest, PerformancePredictResponse


router = APIRouter(prefix="/performance", tags=["performance"])


@router.post("/predict", response_model=PerformancePredictResponse)
def predict_performance(request: PerformancePredictRequest) -> PerformancePredictResponse:
    return predict_performance_payload(
        cgpa=request.cgpa,
        skills_count=request.skills_count,
        projects_count=request.projects_count,
        mock_interview_avg=request.mock_interview_avg,
        ats_score=request.ats_score,
        streak=request.streak,
    )
