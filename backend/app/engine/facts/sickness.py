"""Fakty — zasiłek chorobowy i wynagrodzenie chorobowe (zus_rules/07 §4).

BE1-04: zestaw potrzebny do ustalenia prawa, płatnika i stawki (SICK-ELIG, SICK-RATE, SICKPAY-ELIG/RATE).
Okresy, limity 182/270 dni, podział wynagrodzenie/zasiłek i kwoty — BE1-05.
"""
from __future__ import annotations

from typing import Any

from app.core.dates import to_date
from app.engine.facts.registry import Context, fact

# Stan ustawiany przez pipeline po ocenie grupy SICK-ELIG (07 §4 f_sickness_benefit_right_exists)
SICKNESS_RIGHT_STATE = "sickness_benefit_right"


@fact("f_incapacity_in_pregnancy")
def incapacity_in_pregnancy(ctx: Context) -> bool | None:
    """07 §4: TRUE gdy kod B w ``incapacity.codes`` albo ``pregnancy.is_pregnant_during_incapacity = true``;
    FALSE tylko gdy ``is_pregnant_during_incapacity = false``; inaczej None (brak kodu B ≠ brak ciąży).

    USTAWA art. 11 ust. 2 pkt 1, art. 57 ust. 2; KP art. 92 § 1 pkt 2.
    """
    codes = ctx.field("incapacity.codes") or []
    declared = ctx.field("pregnancy.is_pregnant_during_incapacity")
    if "B" in codes or declared is True:
        return True
    if declared is False:
        return False
    return ctx.need("pregnancy.is_pregnant_during_incapacity")


@fact("f_sick_pay_day_limit")
def sick_pay_day_limit(ctx: Context, year: Any = None) -> int | None:
    """07 §4: SICK_PAY_DAYS_50PLUS, gdy ``year > rok(person.birth_date) + SICK_PAY_AGE_THRESHOLD``,
    inaczej SICK_PAY_DAYS_STD (limit obniżony od roku NASTĘPNEGO po ukończeniu 50 lat). KP art. 92 § 1 pkt 1, § 5.
    """
    birth = to_date(ctx.field("person.birth_date"))
    if birth is None:
        return ctx.need("person.birth_date")
    if year is None:
        return None
    if int(year) > birth.year + int(ctx.param("SICK_PAY_AGE_THRESHOLD")):
        return int(ctx.param("SICK_PAY_DAYS_50PLUS"))
    return int(ctx.param("SICK_PAY_DAYS_STD"))


@fact("f_sick_pay_days_remaining_in_year")
def sick_pay_days_remaining_in_year(ctx: Context) -> int | None:
    """07 §4: ``max(0, f_sick_pay_day_limit(rok niezdolności) − benefit_history.employer_sick_pay_days_in_year)``.

    Niezdolność przechodząca przez 31.12 (odnowienie limitu) — BE1-05. KP art. 92 § 1.
    """
    start = to_date(ctx.field("incapacity.start_date"))
    if start is None:
        return ctx.need("incapacity.start_date")
    used = ctx.field("benefit_history.employer_sick_pay_days_in_year")
    limit = ctx.fact("f_sick_pay_day_limit", year=start.year)
    if used is None:
        return ctx.need("benefit_history.employer_sick_pay_days_in_year")
    if limit is None:
        return None
    return max(0, limit - int(used))


@fact("f_sickness_benefit_right_exists")
def sickness_benefit_right_exists(ctx: Context) -> bool | None:
    """07 §4: Kleene-AND grupy SICK-ELIG (001∨006, okres wyczekiwania 002/003/005), NOT SICK-EXCL-*, NOT GEN-EXCL-001.

    Wartość ustala pipeline (``engine/pipeline/sickness.py``) przed oceną reguł SICKPAY-*; brak oceny → None.
    KP art. 92 § 3 pkt 2.
    """
    return ctx.state.get(SICKNESS_RIGHT_STATE)
