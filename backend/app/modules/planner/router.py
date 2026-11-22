"""Planer wyborów urlopowych (BE2-07): POST /api/planner/suggest, POST /api/planner/graph."""
from typing import Any

from fastapi import APIRouter

from app.core.params import ruleset_version
from app.engine.planner import ENGINE_NAME, InvalidChoice, ParentProfile, Planner, Profile
from app.modules.planner.schemas import PlannerGraphRequest, PlannerParent, PlannerProfile, PlannerSuggestRequest

router = APIRouter(prefix="/api/planner", tags=["planner"])

ASSUMPTIONS = [
    {"code": "ROUNDING_UNCONFIRMED",
     "text": "Kwoty liczone dokładnie, bez zaokrągleń pośrednich; na ekranie pokazane z dokładnością do 1 grosza."},
    {"code": "PLANNER_TRANSFERRED_MATERNITY_RATE",
     "text": "Macierzyński przejęty przez ojca liczony 100% podstawy ojca (stawka 81,5% z wniosku łącznego dotyczy "
             "urlopu macierzyńskiego matki)."},
    {"code": "PLANNER_FATHER_RATE_UNDER_815",
     "text": "Stawka ojca na wspólnej części rodzicielskiego przy wniosku 81,5% matki nie wynika jednoznacznie z "
             "przepisów - liczona 70%, plan oznaczony do weryfikacji."},
    {"code": "PLANNER_NO_PRE_BIRTH_PART",
     "text": "Macierzyński liczony od dnia porodu (bez części przedporodowej); rodzicielski zaraz po "
             "macierzyńskim, w 1. roku życia dziecka."},
    {"code": "PLANNER_FLOOR_DAILY",
     "text": "Miesięczny zasiłek niższy niż kwota świadczenia rodzicielskiego podwyższony do niej "
             "jako kwota dzienna = kwota miesięczna / 30; niepełne miesiące liczone proporcjonalnie do dni "
             "miesiąca. Przy pracy na rodzicielskim bez podwyższenia."},
    {"code": "PLANNER_BASE_AS_GIVEN",
     "text": "Podstawa wymiaru przyjęta tak, jak ją podano - minimalna podstawa przy pełnym etacie "
             "i limit przy dobrowolnym chorobowym są stosowane w głównym wyniku kalkulatora."},
    {"code": "PLANNER_WORK_INCOME",
     "text": "Przy pracy na rodzicielskim do kwoty planu doliczane jest wynagrodzenie (brutto, proporcjonalnie do "
             "wymiaru); bez podanego wynagrodzenia - szacunek: podstawa / (1 − 13,71%)."},
]


def _profile(raw: PlannerProfile) -> Profile:
    def parent(p: PlannerParent) -> ParentProfile:
        return ParentProfile(p.base_monthly, p.insured, p.gross_monthly, p.can_work_part_time)
    return Profile(parent(raw.mother), parent(raw.father), raw.children_count, raw.za_zyciem)


def _envelope(objective: str, status: str, missing: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    return {"engine": ENGINE_NAME, "ruleset_version": ruleset_version(), "objective": objective, "status": status,
            "missing_data": missing or [], "assumptions": ASSUMPTIONS}


def _precheck(raw: PlannerProfile) -> tuple[str, list[dict[str, Any]]] | None:
    if not raw.mother.insured:
        return "OUT_OF_SCOPE", []
    missing = [{"field": f"profile.{who}.base_monthly", "rule_ids": ["CALC-MAT-001"]}
               for who in ("mother", "father")
               if getattr(raw, who).insured and getattr(raw, who).base_monthly is None]
    return ("NEEDS_DATA", missing) if missing else None


@router.post("/suggest")
def suggest(request: PlannerSuggestRequest) -> dict[str, Any]:
    stop = _precheck(request.profile)
    if stop:
        return _envelope(request.objective, *stop)
    planner = Planner(_profile(request.profile), request.objective)
    try:
        result = planner.suggest(list(request.choices), request.lookback)
        invalid = None
    except InvalidChoice as exc:
        # błędny wybór → wskazanie reguły i sugestia od ostatniego poprawnego kroku
        invalid = {"index": exc.index, "step_id": exc.step.id, "value": exc.value,
                   "blocked_by_rule": exc.option.blocked_by if exc.option else None, "reason": str(exc)}
        result = planner.suggest(list(request.choices[:exc.index]), request.lookback)
        result["status"] = "INVALID_CHOICE"
    return {**_envelope(request.objective, result.pop("status")), **result, "invalid_choice": invalid}


@router.post("/graph")
def graph(request: PlannerGraphRequest) -> dict[str, Any]:
    stop = _precheck(request.profile)
    if stop:
        return _envelope(request.objective, *stop)
    return {**_envelope(request.objective, "OK"), **Planner(_profile(request.profile), request.objective)
            .graph(request.depth)}
