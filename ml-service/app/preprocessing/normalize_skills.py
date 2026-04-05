from __future__ import annotations

import re
from functools import lru_cache

from app.core.config import PROCESSED_DATA_DIR
from app.core.constants import SKILL_ALIASES
from app.utils.serializers import load_json_file
from app.utils.text import normalize_text


@lru_cache(maxsize=1)
def get_skills_master() -> list[str]:
    payload = load_json_file(PROCESSED_DATA_DIR / "skills_master.json")
    return sorted({str(skill).strip() for skill in payload.get("skills", []) if str(skill).strip()})


def normalize_skill_name(value: str) -> str:
    raw = normalize_text(value)
    if raw in SKILL_ALIASES:
        return SKILL_ALIASES[raw]

    for canonical in get_skills_master():
        if raw == normalize_text(canonical):
            return canonical

    return value.strip()


def extract_skills_from_text(text: str) -> list[str]:
    normalized_text = normalize_text(text)
    matched: set[str] = set()

    for alias, canonical in SKILL_ALIASES.items():
        pattern = rf"(?<![a-z0-9]){re.escape(alias)}(?![a-z0-9])"
        if re.search(pattern, normalized_text):
            matched.add(canonical)

    for skill in get_skills_master():
        pattern = rf"(?<![a-z0-9]){re.escape(normalize_text(skill))}(?![a-z0-9])"
        if re.search(pattern, normalized_text):
            matched.add(skill)

    return sorted(matched)
