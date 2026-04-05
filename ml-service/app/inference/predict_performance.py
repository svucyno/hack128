from __future__ import annotations

from app.schemas.performance import PerformancePredictResponse


def predict_performance_payload(
    cgpa: float,
    skills_count: int,
    projects_count: int,
    mock_interview_avg: float,
    ats_score: float,
    streak: int,
) -> PerformancePredictResponse:
    normalized_cgpa = min(max(cgpa / 10, 0.0), 1.0)
    normalized_skills = min(skills_count / 15, 1.0)
    normalized_projects = min(projects_count / 6, 1.0)
    normalized_mock = min(max(mock_interview_avg / 100, 0.0), 1.0)
    normalized_ats = min(max(ats_score / 100, 0.0), 1.0)
    normalized_streak = min(streak / 14, 1.0)

    placement_probability = round(
        normalized_cgpa * 0.18
        + normalized_skills * 0.20
        + normalized_projects * 0.15
        + normalized_mock * 0.17
        + normalized_ats * 0.20
        + normalized_streak * 0.10,
        2,
    )

    if placement_probability >= 0.75:
        risk_level = "low"
    elif placement_probability >= 0.5:
        risk_level = "medium"
    else:
        risk_level = "high"

    top_factors = []
    if ats_score >= 75:
        top_factors.append("ATS performance is already in a strong range.")
    else:
        top_factors.append("ATS score still needs improvement for better shortlist chances.")
    if mock_interview_avg >= 70:
        top_factors.append("Mock interview performance supports placement readiness.")
    else:
        top_factors.append("Interview scores indicate practice is still needed.")
    if projects_count >= 3:
        top_factors.append("Project depth is helping the profile stand out.")
    else:
        top_factors.append("More project proof would improve placement confidence.")

    suggestions = []
    if ats_score < 80:
        suggestions.append("Raise ATS score above 80 with role-specific resume tailoring.")
    if mock_interview_avg < 75:
        suggestions.append("Practice mock interviews until the average stays above 75.")
    if projects_count < 3:
        suggestions.append("Add at least one more proof-heavy project to strengthen the profile.")
    if streak < 7:
        suggestions.append("Improve weekly consistency so momentum does not drop.")

    return PerformancePredictResponse(
        placement_probability=placement_probability,
        risk_level=risk_level,
        confidence=round(min(0.92, 0.55 + (skills_count * 0.015) + (projects_count * 0.03)), 2),
        top_factors=top_factors[:4],
        suggestions=suggestions[:4],
    )
