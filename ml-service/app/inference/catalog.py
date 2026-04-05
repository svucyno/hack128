from __future__ import annotations

from functools import lru_cache

from app.core.config import PROCESSED_DATA_DIR
from app.utils.serializers import load_json_file


@lru_cache(maxsize=1)
def get_role_skill_map() -> dict:
    return load_json_file(PROCESSED_DATA_DIR / "role_skill_map.json")


@lru_cache(maxsize=1)
def get_jobs_seed() -> list[dict]:
    payload = load_json_file(PROCESSED_DATA_DIR / "jobs_seed.json")
    return payload.get("jobs", [])


@lru_cache(maxsize=1)
def get_courses_seed() -> list[dict]:
    payload = load_json_file(PROCESSED_DATA_DIR / "courses_seed.json")
    return payload.get("courses", [])
