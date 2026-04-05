from __future__ import annotations

from fastapi import APIRouter

from app.inference.predict_role import predict_role_payload
from app.schemas.roles import RolePredictRequest, RolePredictResponse


router = APIRouter(prefix="/roles", tags=["roles"])


@router.post("/predict", response_model=RolePredictResponse)
def predict_roles(request: RolePredictRequest) -> RolePredictResponse:
    return predict_role_payload(request.skills, request.education, request.interests)
