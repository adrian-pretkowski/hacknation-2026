from typing import Any

from fastapi import APIRouter

from app.core.config import get_settings
from app.engine import pipeline, slice_v0
from app.modules.evaluation.schemas import EvaluateRequest

router = APIRouter(prefix="/api", tags=["evaluation"])


@router.post("/evaluate")
def evaluate(request: EvaluateRequest) -> dict[str, Any]:
    payload = request.model_dump(mode="json", by_alias=True, exclude_none=False)
    engine = slice_v0 if get_settings().engine == "slice" else pipeline
    return engine.evaluate(payload)
