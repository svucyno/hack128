from __future__ import annotations

from app.preprocessing.normalize_skills import extract_skills_from_text
from app.schemas.ats import AtsScoreResponse
from app.utils.similarity import cosine_similarity
from app.utils.text import tokenize


def score_ats_payload(resume_text: str, job_description: str) -> AtsScoreResponse:
    resume_skills = set(extract_skills_from_text(resume_text))
    jd_skills = set(extract_skills_from_text(job_description))

    matched_skills = sorted(resume_skills & jd_skills)
    missing_skills = sorted(jd_skills - resume_skills)

    resume_keywords = set(tokenize(resume_text))
    jd_keywords = set(tokenize(job_description))
    matched_keywords = sorted(resume_keywords & jd_keywords)
    missing_keywords = sorted(jd_keywords - resume_keywords)

    skill_match_score = _to_percent(len(matched_skills), len(jd_skills) or 1)
    keyword_match_score = _to_percent(len(matched_keywords), len(jd_keywords) or 1)
    semantic_match_score = round(cosine_similarity(resume_text, job_description) * 100)
    ats_score = round(skill_match_score * 0.45 + keyword_match_score * 0.35 + semantic_match_score * 0.20)

    strengths = []
    weaknesses = []
    suggestions = []

    if matched_skills:
        strengths.append(f"Matched {len(matched_skills)} required skills from the job description.")
    if semantic_match_score >= 70:
        strengths.append("Resume language aligns well with the job description.")
    if missing_skills:
        weaknesses.append(f"Missing critical skills: {', '.join(missing_skills[:4])}.")
        suggestions.append(f"Add evidence for {', '.join(missing_skills[:3])} if you have that experience.")
    if missing_keywords:
        weaknesses.append("Important JD keywords are missing from the resume wording.")
        suggestions.append(f"Incorporate keywords like {', '.join(missing_keywords[:4])}.")
    if ats_score < 70:
        suggestions.append("Rewrite project bullets with stronger action verbs and measurable outcomes.")

    if not strengths:
        strengths.append("Resume has enough content to run ATS matching.")
    if not weaknesses:
        weaknesses.append("No major ATS gaps were detected in the baseline pass.")
    if not suggestions:
        suggestions.append("Keep tailoring the resume to each job description.")

    return AtsScoreResponse(
        ats_score=max(0, min(100, ats_score)),
        skill_match_score=max(0, min(100, skill_match_score)),
        keyword_match_score=max(0, min(100, keyword_match_score)),
        semantic_match_score=max(0, min(100, semantic_match_score)),
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        matched_keywords=matched_keywords[:20],
        missing_keywords=missing_keywords[:20],
        strengths=strengths[:4],
        weaknesses=weaknesses[:4],
        suggestions=suggestions[:5],
    )


def _to_percent(part: int, whole: int) -> int:
    return round((part / whole) * 100) if whole else 0
