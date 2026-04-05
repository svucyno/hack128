from __future__ import annotations

from math import sqrt

from app.utils.text import token_counter


def cosine_similarity(text_a: str, text_b: str) -> float:
    counts_a = token_counter(text_a)
    counts_b = token_counter(text_b)

    if not counts_a or not counts_b:
        return 0.0

    intersection = set(counts_a) & set(counts_b)
    dot_product = sum(counts_a[token] * counts_b[token] for token in intersection)
    norm_a = sqrt(sum(value * value for value in counts_a.values()))
    norm_b = sqrt(sum(value * value for value in counts_b.values()))

    if not norm_a or not norm_b:
        return 0.0

    return dot_product / (norm_a * norm_b)


def ratio(part: int, whole: int) -> float:
    if whole <= 0:
      return 0.0
    return part / whole
