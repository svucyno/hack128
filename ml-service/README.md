# LevelUp ML Service

Baseline ML service for:

- resume parsing
- ATS scoring
- role prediction
- skill-gap analysis
- job matching
- performance prediction
- course recommendations

## Run locally

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Endpoints

- `GET /health`
- `POST /resume/parse`
- `POST /ats/score`
- `POST /roles/predict`
- `POST /skills/gap`
- `POST /jobs/match`
- `POST /performance/predict`
- `POST /recommendations/courses`

## Notes

- This is a working baseline service using heuristics and lightweight similarity.
- It is intentionally structured so you can replace the heuristic inference modules with trained models later.
- Sample processed data is stored in `data/processed/`.
