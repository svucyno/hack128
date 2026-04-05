from __future__ import annotations

from app.inference.catalog import get_jobs_seed
from app.preprocessing.normalize_skills import extract_skills_from_text
from app.schemas.jobs import JobMatchItem, JobMatchResponse
from app.utils.similarity import cosine_similarity


def match_jobs_payload(resume_text: str, target_roles: list[str], location: str = "") -> JobMatchResponse:
    jobs = get_jobs_seed()
    resume_skills = set(extract_skills_from_text(resume_text))
    target_role_set = {role.strip().lower() for role in target_roles if str(role).strip()}
    requested_location = str(location or "").strip().lower()

    matches = []
    for job in jobs:
        role = str(job.get("role", "")).strip()
        if target_role_set and role.lower() not in target_role_set:
            continue

        jd_text = str(job.get("description", ""))
        jd_skills = set(job.get("skills", []))
        matched_skills = sorted(resume_skills & jd_skills)
        missing_skills = sorted(jd_skills - resume_skills)
        skill_score = (len(matched_skills) / len(jd_skills)) if jd_skills else 0.0
        semantic_score = cosine_similarity(resume_text, jd_text)
        location_score = 0.1 if requested_location and requested_location in str(job.get("location", "")).lower() else 0.0
        total_score = min(1.0, skill_score * 0.65 + semantic_score * 0.25 + location_score)

        why_fit = []
        if matched_skills:
            why_fit.append(f"Matched skills: {', '.join(matched_skills[:4])}.")
        if semantic_score >= 0.55:
            why_fit.append("Resume language aligns with the job description.")
        if requested_location and requested_location in str(job.get("location", "")).lower():
            why_fit.append("Matches the requested location preference.")

        matches.append(
            JobMatchItem(
                job_id=str(job.get("job_id", "")),
                company=str(job.get("company", "")),
                role=role,
                location=str(job.get("location", "")),
                work_mode=str(job.get("work_mode", "")),
                match_score=round(total_score, 2),
                matched_skills=matched_skills,
                missing_skills=missing_skills[:5],
                why_fit=why_fit[:3] or ["Baseline match derived from skills and JD overlap."],
            )
        )

    matches.sort(key=lambda item: item.match_score, reverse=True)
    return JobMatchResponse(matches=matches[:8])
