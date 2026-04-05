from __future__ import annotations

import re

from app.core.constants import EDUCATION_KEYWORDS, EXPERIENCE_KEYWORDS
from app.preprocessing.normalize_skills import extract_skills_from_text
from app.schemas.resume import EducationEntry, ExperienceEntry, ParseResumeResponse, ProjectEntry
from app.utils.text import split_lines


EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_PATTERN = re.compile(r"(\+?\d[\d\-\s]{8,}\d)")
YEAR_PATTERN = re.compile(r"(20\d{2}|19\d{2})")


def parse_resume_payload(resume_text: str, file_name: str = "Resume") -> ParseResumeResponse:
    lines = split_lines(resume_text)
    lower_lines = [line.lower() for line in lines]

    email = _match_first(EMAIL_PATTERN, resume_text)
    phone = _match_first(PHONE_PATTERN, resume_text)
    name = _infer_name(lines, email, phone)
    skills = extract_skills_from_text(resume_text)
    education = _extract_education(lines)
    experience = _extract_experience(lines)
    projects = _extract_projects(lines, skills)
    experience_level = "Fresher" if not experience else "Experienced"

    keywords = sorted({skill.lower() for skill in skills})
    if file_name and file_name not in keywords:
        keywords.extend(token for token in file_name.lower().replace(".", " ").split() if token)

    return ParseResumeResponse(
        name=name,
        email=email,
        phone=phone,
        skills=skills,
        education=education,
        experience=experience,
        projects=projects,
        keywords=sorted(set(keywords)),
        experience_level=experience_level,
    )


def _match_first(pattern: re.Pattern, text: str) -> str:
    match = pattern.search(text or "")
    return match.group(0).strip() if match else ""


def _infer_name(lines: list[str], email: str, phone: str) -> str:
    for line in lines[:6]:
        clean = line.strip()
        if not clean or len(clean) > 60:
            continue
        if email and email in clean:
            continue
        if phone and phone in clean:
            continue
        if any(char.isdigit() for char in clean):
            continue
        return clean
    return ""


def _extract_education(lines: list[str]) -> list[EducationEntry]:
    matches: list[EducationEntry] = []
    for line in lines:
        normalized = line.lower()
        degree = next((label for key, label in EDUCATION_KEYWORDS.items() if key in normalized), "")
        if not degree:
            continue

        year_match = YEAR_PATTERN.search(line)
        matches.append(
            EducationEntry(
                degree=degree,
                field=_guess_field(line),
                institution=line.strip(),
                year=year_match.group(0) if year_match else "",
            )
        )

    return matches[:3]


def _guess_field(line: str) -> str:
    lower = line.lower()
    if "computer" in lower or "cse" in lower:
        return "Computer Science"
    if "data" in lower:
        return "Data Science"
    if "electronic" in lower or "ece" in lower:
        return "Electronics"
    return ""


def _extract_experience(lines: list[str]) -> list[ExperienceEntry]:
    entries: list[ExperienceEntry] = []
    for line in lines:
        normalized = line.lower()
        if not any(keyword in normalized for keyword in EXPERIENCE_KEYWORDS):
            continue
        entries.append(
            ExperienceEntry(
                title=line.strip(),
                description=line.strip(),
            )
        )
    return entries[:4]


def _extract_projects(lines: list[str], skills: list[str]) -> list[ProjectEntry]:
    entries: list[ProjectEntry] = []
    for line in lines:
        normalized = line.lower()
        if "project" not in normalized and "built" not in normalized and "developed" not in normalized:
            continue
        project_skills = [skill for skill in skills if skill.lower() in normalized]
        entries.append(
            ProjectEntry(
                title=_project_title_from_line(line),
                description=line.strip(),
                skills=project_skills[:5],
            )
        )

    return entries[:4]


def _project_title_from_line(line: str) -> str:
    segments = re.split(r"[-:|]", line, maxsplit=1)
    title = segments[0].strip()
    return title[:80] or "Project"
