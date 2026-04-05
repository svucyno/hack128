from __future__ import annotations

from pydantic import BaseModel, Field


class ParseResumeRequest(BaseModel):
    resume_text: str = Field(..., min_length=1)
    file_name: str = "Resume"


class EducationEntry(BaseModel):
    degree: str
    field: str = ""
    institution: str = ""
    year: str = ""


class ExperienceEntry(BaseModel):
    title: str
    company: str = ""
    duration: str = ""
    description: str = ""


class ProjectEntry(BaseModel):
    title: str
    description: str = ""
    skills: list[str] = Field(default_factory=list)


class ParseResumeResponse(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    skills: list[str] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    experience: list[ExperienceEntry] = Field(default_factory=list)
    projects: list[ProjectEntry] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    experience_level: str = ""
