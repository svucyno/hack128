from __future__ import annotations

from fastapi import APIRouter

from app.inference.match_jobs import match_jobs_payload
from app.schemas.jobs import JobMatchRequest, JobMatchResponse


router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/match", response_model=JobMatchResponse)
def match_jobs(request: JobMatchRequest) -> JobMatchResponse:
    return match_jobs_payload(request.resume_text, request.target_roles, request.location)
