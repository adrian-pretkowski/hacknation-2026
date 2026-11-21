from typing import Any

from fastapi import APIRouter

from app.engine import slice_v0
from app.modules.evaluation.schemas import EvaluateRequest

router = APIRouter(prefix="/api", tags=["evaluation"])


@router.post("/evaluate")
def evaluate(request: EvaluateRequest) -> dict[str, Any]:
    payload = request.model_dump(mode="json", by_alias=True, exclude_none=False)
    return slice_v0.evaluate(payload)
