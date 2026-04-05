from __future__ import annotations

from fastapi import APIRouter

from app.inference.score_ats import score_ats_payload
from app.schemas.ats import AtsScoreRequest, AtsScoreResponse


router = APIRouter(prefix="/ats", tags=["ats"])


@router.post("/score", response_model=AtsScoreResponse)
def score_ats(request: AtsScoreRequest) -> AtsScoreResponse:
    return score_ats_payload(request.resume_text, request.job_description)
