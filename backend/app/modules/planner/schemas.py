"""Modele żądań planera (BE2-07) — zgodne z contracts/openapi.yaml (PlannerSuggestRequest, PlannerGraphRequest)."""
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PlannerParent(Strict):
    base_monthly: Decimal | None = Field(default=None, ge=0)
    insured: bool = True
    gross_monthly: Decimal | None = Field(default=None, ge=0)
    can_work_part_time: bool = True


class PlannerProfile(Strict):
    children_count: int = Field(default=1, ge=1, le=10)
    za_zyciem: bool = False
    mother: PlannerParent
    father: PlannerParent


class PlannerSuggestRequest(Strict):
    profile: PlannerProfile
    choices: list[bool | int | str] = Field(default_factory=list, max_length=7)
    objective: Literal["MAX_MONEY", "MAX_TIME"] = "MAX_MONEY"
    lookback: int = Field(default=2, ge=0, le=7)


class PlannerGraphRequest(Strict):
    profile: PlannerProfile
    objective: Literal["MAX_MONEY", "MAX_TIME"] = "MAX_MONEY"
    depth: int = Field(default=5, ge=1, le=7)
