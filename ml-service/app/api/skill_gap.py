from __future__ import annotations

from fastapi import APIRouter

from app.inference.analyze_skill_gap import analyze_skill_gap_payload
from app.schemas.roles import SkillGapRequest, SkillGapResponse


router = APIRouter(prefix="/skills", tags=["skills"])


@router.post("/gap", response_model=SkillGapResponse)
def skill_gap(request: SkillGapRequest) -> SkillGapResponse:
    return analyze_skill_gap_payload(request.user_skills, request.target_role)
