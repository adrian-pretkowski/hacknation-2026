"""Modele żądania — podzbiór zus_rules/04_INPUT_DATA_SCHEMA.json zgodny z contracts/openapi.yaml.

extra="allow": pełny model wejścia jest przyjmowany (forward compatibility), slice-v0 czyta tylko te pola.
"""
import datetime as dt
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Loose(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)


class Evaluation(Loose):
    as_of_date: dt.date | None = None


class Person(Loose):
    role: Literal["MOTHER", "FATHER", "OTHER_FAMILY_MEMBER", "ADOPTIVE_PARENT", "FOSTER_PARENT"] | None = None


class InsuranceTitle(Loose):
    title_type: str
    sickness_insurance_mode: Literal["MANDATORY", "VOLUNTARY", "NONE"]
    from_: dt.date = Field(alias="from")
    to: dt.date | None = None


class Insurance(Loose):
    titles: list[InsuranceTitle] | None = None


class Event(Loose):
    type: Literal["BIRTH", "ADOPTION", "FOSTER", "PREGNANCY_INCAPACITY", "SICKNESS"]
    date: dt.date | None = None


class Children(Loose):
    count_at_birth: int | None = Field(default=None, ge=1)


class IncomeHistory(Loose):
    manual_base_override: Decimal | None = None


class Applications(Loose):
    combined_815_filed_date: dt.date | None = None
    combined_815_planned: bool | None = None


class Debt(Loose):
    amount_on_right_date: Decimal | None = None


class EvaluateRequest(Loose):
    evaluation: Evaluation | None = None
    person: Person | None = None
    insurance: Insurance | None = None
    event: Event
    children: Children | None = None
    income_history: IncomeHistory | None = None
    applications: Applications | None = None
    debt: Debt | None = None
