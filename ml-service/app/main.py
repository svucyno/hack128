from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ats_score import router as ats_router
from app.api.job_matcher import router as job_matcher_router
from app.api.performance_predictor import router as performance_router
from app.api.recommender import router as recommender_router
from app.api.resume_parser import router as resume_router
from app.api.role_predictor import router as role_router
from app.api.skill_gap import router as skill_gap_router
from app.core.config import ML_CORS_ORIGINS, ML_SERVICE_NAME, ML_SERVICE_VERSION


app = FastAPI(
    title=ML_SERVICE_NAME,
    version=ML_SERVICE_VERSION,
    description="Baseline ML service for resume parsing, ATS scoring, role prediction, skill-gap analysis, job matching, and placement prediction.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ML_CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume_router)
app.include_router(ats_router)
app.include_router(role_router)
app.include_router(skill_gap_router)
app.include_router(job_matcher_router)
app.include_router(performance_router)
app.include_router(recommender_router)


@app.get("/health")
def healthcheck() -> dict:
    return {
        "ok": True,
        "service": ML_SERVICE_NAME,
        "version": ML_SERVICE_VERSION,
        "features": [
            "resume-parse",
            "ats-score",
            "role-predict",
            "skill-gap",
            "job-match",
            "performance-predict",
            "course-recommendations",
        ],
    }
