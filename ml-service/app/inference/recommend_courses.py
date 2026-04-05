from __future__ import annotations

from app.inference.catalog import get_courses_seed, get_role_skill_map
from app.preprocessing.normalize_skills import normalize_skill_name
from app.schemas.jobs import CourseRecommendationItem, CourseRecommendationResponse


def recommend_courses_payload(
    target_role: str,
    user_skills: list[str],
    missing_skills: list[str],
) -> CourseRecommendationResponse:
    normalized_user_skills = {normalize_skill_name(skill) for skill in user_skills}
    normalized_missing_skills = {normalize_skill_name(skill) for skill in missing_skills}
    role_skill_map = get_role_skill_map()
    role_metadata = role_skill_map.get(target_role, {})
    role_skills = set(role_metadata.get("skills", []))

    recommendations = []
    for course in get_courses_seed():
        course_skills = set(course.get("skills", []))
        missing_overlap = len(course_skills & normalized_missing_skills)
        role_overlap = len(course_skills & role_skills)
        new_skill_gain = len(course_skills - normalized_user_skills)
        score = min(1.0, missing_overlap * 0.35 + role_overlap * 0.12 + new_skill_gain * 0.08)

        if score <= 0:
            continue

        reasons = []
        if missing_overlap:
            reasons.append("targets your current missing skills")
        if role_overlap:
            reasons.append("matches the target role skill stack")
        if new_skill_gain:
            reasons.append("adds fresh portfolio-ready skills")

        recommendations.append(
            CourseRecommendationItem(
                title=course.get("title", ""),
                provider=course.get("provider", ""),
                level=course.get("level", ""),
                skills=course.get("skills", []),
                recommendation_score=round(score, 2),
                reason=", ".join(reasons).capitalize() + ".",
            )
        )

    recommendations.sort(key=lambda item: item.recommendation_score, reverse=True)
    return CourseRecommendationResponse(recommendations=recommendations[:6])
