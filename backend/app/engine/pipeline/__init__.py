"""Pipeline silnika reguł (interfejs I1, BE1-02): ``evaluate(payload) -> wynik wg contracts/openapi.yaml``.

Zakres dziś: zasiłek macierzyński matki po porodzie (``maternity.py``) — ten sam zakres co slice_v0,
ale na regułach z 03_rules.yaml (tryby, wyjątki, overrides, DT-9, ślad ``applied_rules``, ``future_changes``).
Kolejne świadczenia (chorobowy, rodzicielski, ojcowski, uzupełniający) dopisują swoje moduły kroków.
"""
from __future__ import annotations

import uuid
from functools import lru_cache
from typing import Any

from app.core.config import get_settings
from app.core.dates import to_date
from app.core.params import ruleset_version
from app.engine.dsl import Ruleset, load_ruleset
from app.engine.facts import Context
from app.engine.pipeline.engine import STATUS_ORDER, Engine
from app.engine.pipeline.maternity import evaluate_maternity

ENGINE_NAME = "rules-engine"
ROUNDING = {"code": "ROUNDING_UNCONFIRMED",
            "text": "Kwoty bez zaokrągleń — zasady zaokrąglania ZUS niepotwierdzone (GAP-001)."}
PARAM_ASSUMPTIONS = {
    "MIN_WAGE_2026_MONTHLY": {"code": "MIN_WAGE_FROM_ATTACHMENT",
                              "text": "Płaca minimalna 2026 wzięta z Załącznika HackNation (niepotwierdzona)."},
}


@lru_cache
def ruleset() -> Ruleset:
    return load_ruleset(get_settings().rules_path)


def evaluate(payload: dict[str, Any]) -> dict[str, Any]:
    evaluation = payload.get("evaluation") or {}
    as_of = to_date(evaluation.get("as_of_date")) or to_date(get_settings().law_reference_date)
    eng = Engine(ruleset(), Context(input=payload, as_of=as_of))

    if (payload.get("event") or {}).get("type") != "BIRTH":
        return _response(eng, [], [{"code": "OUT_OF_SCOPE_SLICE",
                                    "text": "Silnik reguł obsługuje na razie tylko event.type=BIRTH."}], "OUT_OF_SCOPE")
    benefits = [evaluate_maternity(eng)]
    assumptions = [ROUNDING] + [PARAM_ASSUMPTIONS[p] for p in eng.unconfirmed_params() if p in PARAM_ASSUMPTIONS]
    overall = next((s for s in STATUS_ORDER if any(b["status"] == s for b in benefits)), "NEEDS_DATA")
    return _response(eng, benefits, assumptions, overall)


def _response(eng: Engine, benefits: list[dict[str, Any]], assumptions: list[dict[str, Any]],
              overall: str) -> dict[str, Any]:
    return {
        "evaluation_id": str(uuid.uuid4()),
        "ruleset_version": ruleset_version(),
        "law_reference_date": get_settings().law_reference_date,
        "engine": ENGINE_NAME,
        "overall_status": overall,
        "benefits": benefits,
        "missing_data": eng.missing_data(),
        "assumptions": assumptions,
        "not_evaluated_rules": eng.not_evaluated,
        "applied_rules": eng.applied_trace(),
        "future_changes": eng.future,
    }
