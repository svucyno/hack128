from __future__ import annotations

import re
from collections import Counter

from app.core.constants import STOPWORDS


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip()).lower()


def split_lines(value: str) -> list[str]:
    return [line.strip() for line in str(value or "").splitlines() if line.strip()]


def tokenize(value: str) -> list[str]:
    normalized = normalize_text(value)
    tokens = re.findall(r"[a-z0-9\+\#\.]+", normalized)
    return [token for token in tokens if token not in STOPWORDS and len(token) > 1]


def token_counter(value: str) -> Counter:
    return Counter(tokenize(value))
