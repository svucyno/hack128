from __future__ import annotations

from app.inference.catalog import get_role_skill_map
from app.preprocessing.normalize_skills import normalize_skill_name
from app.schemas.roles import SkillGapResponse


def analyze_skill_gap_payload(user_skills: list[str], target_role: str) -> SkillGapResponse:
    role_skill_map = get_role_skill_map()
    metadata = role_skill_map.get(target_role) or _find_nearest_role(target_role, role_skill_map)
    normalized_user_skills = sorted(
        {normalize_skill_name(skill) for skill in user_skills if str(skill).strip()}
    )
    required_skills = metadata.get("skills", []) if metadata else []
    matched_skills = sorted(set(normalized_user_skills) & set(required_skills))
    missing_skills = sorted(set(required_skills) - set(normalized_user_skills))
    gap_score = round((len(missing_skills) / len(required_skills)) if required_skills else 0.0, 2)

    return SkillGapResponse(
        target_role=metadata.get("role", target_role) if metadata else target_role,
        required_skills=required_skills,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        gap_score=gap_score,
        priority_skills=missing_skills[:3],
    )


def _find_nearest_role(target_role: str, role_skill_map: dict) -> dict | None:
    target = str(target_role or "").lower().strip()
    for role, metadata in role_skill_map.items():
        if role.lower() == target:
            return {"role": role, **metadata}
    for role, metadata in role_skill_map.items():
        if target and target in role.lower():
            return {"role": role, **metadata}
    return None
