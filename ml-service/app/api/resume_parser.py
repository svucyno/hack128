from __future__ import annotations

from fastapi import APIRouter

from app.inference.parse_resume import parse_resume_payload
from app.schemas.resume import ParseResumeRequest, ParseResumeResponse


router = APIRouter(prefix="/resume", tags=["resume"])


@router.post("/parse", response_model=ParseResumeResponse)
def parse_resume(request: ParseResumeRequest) -> ParseResumeResponse:
    return parse_resume_payload(request.resume_text, request.file_name)
