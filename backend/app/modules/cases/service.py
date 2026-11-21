"""Sprawy przykładowe (BE2-06): lista, szczegóły, ewaluacja z porównaniem z oczekiwanym wynikiem, upload wniosku.

Źródła spraw: ``demo/cases/*.json`` (SYNTHETIC — dane syntetyczne w repo). Sprawy ZUS (``cases/``) są poza gitem
i nie są tu ładowane (poufność; ZUS_SAMPLE dopiero po zgodzie M02). Format pliku sprawy:
``{case_id, title, source, note, input (04), expected (CaseExpected) | null, documents_sha256?: [..]}``.

Porównanie (kontrakt ``CaseEvaluation``): pola z ``expected`` vs świadczenie o tym samym ``benefit_type`` i
``leave_type``; kwoty Decimal — zgodność dokładna albo z tolerancją ±0,01 zł (podstawa) / ±0,01 zł × dni (kwota
łączna) — GAP-001 (zaokrąglenia ZUS nieznane). Upload: plik tylko w pamięci, bez zapisu i logowania treści; bez AI
(M16e) — znany plik (SHA-256 z ``documents_sha256``) → FIXTURE_MATCH, inny → MANUAL_REQUIRED + lista brakujących pól.
"""
from __future__ import annotations

import copy
import hashlib
import json
import uuid
from decimal import Decimal
from functools import lru_cache
from typing import Any

from app.core.config import REPO_ROOT
from app.core.money import to_decimal
from app.engine import pipeline

CASES_DIR = REPO_ROOT / "demo" / "cases"
AMOUNT_TOLERANCE = Decimal("0.01")  # zł — techniczna tolerancja porównania (GAP-001), nie wartość prawna
FIELDS = ["status", "benefit_type", "leave_type", "period_from", "period_to", "base_amount", "rate", "total_amount"]
# Szkielet wejścia dla nierozpoznanego wniosku: najczęstszy przypadek (poród), do potwierdzenia w kreatorze
UPLOAD_SKELETON: dict[str, Any] = {"evaluation": {"mode": "DECISION_SUPPORT"}, "person": {"role": "MOTHER"},
                                   "event": {"type": "BIRTH"}}


class CaseNotFound(KeyError):
    pass


@lru_cache
def _load_cases() -> dict[str, dict[str, Any]]:
    cases = {}
    for path in sorted(CASES_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        cases[data["case_id"]] = data
    return cases


def _summary(case: dict[str, Any]) -> dict[str, Any]:
    return {"case_id": case["case_id"], "title": case["title"],
            "event_type": (case["input"].get("event") or {}).get("type"),
            "source": case.get("source", "SYNTHETIC"), "has_expected": case.get("expected") is not None}


def list_cases() -> dict[str, Any]:
    return {"items": [_summary(c) for c in _load_cases().values()]}


def get_case(case_id: str) -> dict[str, Any]:
    case = _load_cases().get(case_id)
    if case is None:
        raise CaseNotFound(case_id)
    return {"summary": _summary(case), "input": copy.deepcopy(case["input"]), "expected": case.get("expected")}


# ------------------------------------------------------------------------------------------- porównanie
def _pick_benefit(result: dict[str, Any], expected: dict[str, Any]) -> dict[str, Any] | None:
    for benefit in result.get("benefits") or []:
        if expected.get("benefit_type") and benefit.get("benefit_type") != expected["benefit_type"]:
            continue
        if "leave_type" in expected and benefit.get("leave_type") != expected["leave_type"]:
            continue
        return benefit
    return None


def _actual(benefit: dict[str, Any] | None, field: str) -> Any:
    if benefit is None:
        return None
    period = benefit.get("period") or {}
    return {"status": benefit.get("status"), "benefit_type": benefit.get("benefit_type"),
            "leave_type": benefit.get("leave_type"), "period_from": period.get("from"), "period_to": period.get("to"),
            "base_amount": (benefit.get("base") or {}).get("amount_exact"), "rate": benefit.get("rate"),
            "total_amount": benefit.get("total_amount_exact")}[field]


def _as_str(value: Any) -> str | None:
    return None if value is None else str(value)


def _compare(field: str, expected: Any, actual: Any, days: int | None) -> dict[str, Any]:
    item: dict[str, Any] = {"field": field, "expected": _as_str(expected), "actual": _as_str(actual)}
    if field in ("base_amount", "rate", "total_amount"):
        exp, act = to_decimal(expected), to_decimal(actual)
        item["match"] = exp is not None and act is not None and exp == act if expected is not None else act is None
        if field != "rate" and exp is not None and act is not None:
            tolerance = AMOUNT_TOLERANCE * (days or 1) if field == "total_amount" else AMOUNT_TOLERANCE
            item["match_with_tolerance"] = abs(exp - act) <= tolerance
        else:
            item["match_with_tolerance"] = None
    else:
        item["match"] = expected == actual
        item["match_with_tolerance"] = None
    return item


def evaluate_case(case_id: str) -> dict[str, Any]:
    detail = get_case(case_id)
    result = pipeline.evaluate(detail["input"])
    expected = detail["expected"]
    if not expected:
        return {"case_id": case_id, "result": result, "comparison": [], "overall_match": "NO_EXPECTED"}
    benefit = _pick_benefit(result, expected)
    days = benefit.get("days") if benefit else None
    comparison = [_compare(f, expected[f], _actual(benefit, f), days) for f in FIELDS if f in expected]
    if all(c["match"] for c in comparison):
        overall = "MATCH"
    elif all(c["match"] or c["match_with_tolerance"] for c in comparison):
        overall = "MATCH_WITH_TOLERANCE"
    else:
        overall = "MISMATCH"
    return {"case_id": case_id, "result": result, "comparison": comparison, "overall_match": overall}


# ------------------------------------------------------------------------------------------- upload
def _known_documents() -> dict[str, str]:
    return {digest: case_id for case_id, case in _load_cases().items() for digest in case.get("documents_sha256") or []}


def upload(content: bytes) -> dict[str, Any]:
    """Rozpoznanie wniosku bez AI: SHA-256 znanego pliku → wejście sprawy; inaczej szkielet + brakujące pola."""
    digest = hashlib.sha256(content).hexdigest()
    upload_id = str(uuid.uuid4())
    case_id = _known_documents().get(digest)
    if case_id is not None:
        extracted = get_case(case_id)["input"]
        method, warnings = "FIXTURE_MATCH", [f"Rozpoznano przykładowy wniosek sprawy {case_id} (dane syntetyczne)."]
    else:
        extracted = copy.deepcopy(UPLOAD_SKELETON)
        method = "MANUAL_REQUIRED"
        warnings = ["Nie rozpoznano wniosku — automatyczne odczytywanie treści PDF (AI) jest wyłączone (M16e). "
                    "Uzupełnij dane w kreatorze; plik nie został zapisany.",
                    "Przyjęto zdarzenie „poród” i wnioskodawczynię-matkę (event.type = BIRTH, person.role = MOTHER) "
                    "— zmień, jeśli wniosek dotyczy innej sytuacji."]
    result = pipeline.evaluate(extracted)
    missing = [item["field"] for item in result.get("missing_data") or []]
    if method == "MANUAL_REQUIRED":
        for field in ("event.date",):
            if field not in missing:
                missing.insert(0, field)
        warnings.append(f"Status: {result.get('overall_status')} — do oceny brakuje danych ({len(missing)} pól, "
                        f"lista w missing_fields).")
    return {"upload_id": upload_id, "extracted_input": extracted, "missing_fields": missing,
            "extraction_method": method, "warnings": warnings}
