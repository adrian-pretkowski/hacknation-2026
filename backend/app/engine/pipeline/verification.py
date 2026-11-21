"""Weryfikacja ubezpieczenia (BE2-06, wymóg § 4 zadania) → ``insurance_verification`` w wyniku ewaluacji.

Na dzień zdarzenia (poród / przyjęcie dziecka: ``event.date``; niezdolność: ``incapacity.start_date``):
ubezpieczenie chorobowe (``f_sickness_insured_on``, USTAWA art. 29 ust. 1 / art. 6), tryb
(``f_sickness_insurance_mode_on``), dni nieprzerwanego ubezpieczenia (``f_continuous_sickness_insurance_days``)
i okres wyczekiwania: zasiłek chorobowy — SICK-ELIG-002/003 wg trybu (art. 4 ust. 1; wyjątki SICK-ELIG-005
→ NOT_REQUIRED), macierzyński — nie dotyczy (MAT-CLS-001). Bez wpływu na status świadczeń;
brak danych → UNKNOWN (nigdy FALSE). ``source_documents`` = dokumenty z ``evidence`` (PROVIDED) i źródło tytułów.
"""
from __future__ import annotations

from typing import Any

from app.core.dates import to_date
from app.engine.facts.insurance import INCAPACITY_EVENTS
from app.engine.pipeline.engine import Engine

MATERNITY_EVENTS = ("BIRTH", "ADOPTION", "FOSTER")


def _tri(value: bool | None) -> str:
    return "UNKNOWN" if value is None else "TRUE" if value else "FALSE"


def insurance_verification(eng: Engine) -> dict[str, Any] | None:
    ctx = eng.ctx
    event_type = ctx.field("event.type")
    if event_type not in MATERNITY_EVENTS and event_type not in INCAPACITY_EVENTS:
        return None
    path = "incapacity.start_date" if event_type in INCAPACITY_EVENTS else "event.date"
    day = to_date(ctx.field(path))
    rule_ids: list[str] = []
    insured = mode = days = None
    if day is not None:
        insured = ctx.fact("f_sickness_insured_on", date=day)
        mode = ctx.fact("f_sickness_insurance_mode_on", date=day)
        days = ctx.fact("f_continuous_sickness_insurance_days", as_of=day)
    if event_type in MATERNITY_EVENTS:
        rule_ids += ["MAT-ELIG-001" if event_type == "BIRTH" else "MAT-ELIG-002" if event_type == "ADOPTION"
                     else "MAT-ELIG-003", "MAT-CLS-001"]
        waiting = "NOT_REQUIRED"
    else:
        rule_ids.append("SICK-ELIG-001")
        waiting = "UNKNOWN"
        if mode in ("MANDATORY", "VOLUNTARY"):
            rule_id = "SICK-ELIG-002" if mode == "MANDATORY" else "SICK-ELIG-003"
            rule_ids.append(rule_id)
            outcome = eng.eval(rule_id)
            waiting = _tri(outcome.value)
        if waiting != "TRUE" and eng.eval("SICK-ELIG-005").fired:
            # art. 4 ust. 3: zasiłek od pierwszego dnia ubezpieczenia (absolwent, wypadek w drodze do pracy …)
            rule_ids.append("SICK-ELIG-005")
            waiting = "NOT_REQUIRED"
    titles = ctx.field("insurance.titles") or []
    sources = [d["doc_type"] for d in ctx.field("evidence.documents") or []
               if d.get("status") == "PROVIDED" and d.get("doc_type")]
    if titles and "INSURANCE_TITLES_DATA" not in sources:
        sources.append("INSURANCE_TITLES_DATA")  # tytuły z wniosku / danych ZUS (symulacja) / wpisane ręcznie
    return {
        "sickness_insured_on_event_date": _tri(insured),
        "insurance_mode": mode if insured else ("NONE" if insured is False else None),
        "continuous_insurance_days": days,
        "waiting_period_met": waiting,
        "source_documents": sources,
        "rule_ids": rule_ids,
    }
