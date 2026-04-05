from __future__ import annotations

from pathlib import Path


def read_text_from_file(path: str | Path) -> str:
    file_path = Path(path)
    if not file_path.exists():
        return ""

    if file_path.suffix.lower() in {".txt", ".md"}:
        return file_path.read_text(encoding="utf-8", errors="ignore")

    # Placeholder for PDF/DOCX parsing. Keep the contract stable for later upgrades.
    return ""
