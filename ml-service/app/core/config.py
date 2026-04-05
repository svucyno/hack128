from __future__ import annotations

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
PROCESSED_DATA_DIR = DATA_DIR / "processed"

ML_SERVICE_NAME = os.getenv("ML_SERVICE_NAME", "LevelUp ML Service")
ML_SERVICE_VERSION = os.getenv("ML_SERVICE_VERSION", "0.1.0")
ML_CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ML_CORS_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")
    if origin.strip()
]
