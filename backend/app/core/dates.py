"""Daty i okresy — konwencje C3–C8, C11 z zus_rules/07_CALCULATION_SPEC.md."""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from app.core.params import param


def to_date(value: Any) -> date | None:
    """date | 'YYYY-MM-DD' | None → date | None."""
    if value is None or value == "":
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def week_days() -> int:
    """C4: tydzień urlopu = 7 dni kalendarzowych (parametr WEEK_AS_DAYS)."""
    return int(param("WEEK_AS_DAYS"))


def days_in(start: date, end: date) -> int:
    """C3: liczba dni okresu domkniętego [start, end]."""
    return (end - start).days + 1


def end_after_days(start: date, days: int) -> date:
    """Ostatni dzień okresu `days` dni zaczynającego się w `start` (C3)."""
    return start + timedelta(days=days - 1)


def end_after_weeks(start: date, weeks: int) -> date:
    """C5: koniec okresu N tygodni od dnia d = d + 7N − 1."""
    return end_after_days(start, weeks * week_days())


def in_period(day: date, start: date | None, end: date | None) -> bool:
    """C3: start ≤ day ≤ end; end=None → okres otwarty."""
    return start is not None and start <= day and (end is None or day <= end)


def gap_days_between(prev_end: date, next_start: date) -> int:
    """C8: dni kalendarzowe POMIĘDZY końcem poprzedniego a początkiem następnego okresu (bez obu końców)."""
    return (next_start - prev_end).days - 1


def deadline_after(event: date, days: int) -> date:
    """C11: termin „X dni po zdarzeniu” — ostatni dzień = zdarzenie + X (bez przesunięcia na dzień roboczy, GAP-020)."""
    return event + timedelta(days=days)


def add_years(day: date, years: int) -> date:
    """C7: rocznica; 29.02 w roku nieprzestępnym → 28.02 (DERIVED)."""
    try:
        return day.replace(year=day.year + years)
    except ValueError:
        return day.replace(year=day.year + years, day=28)


def age_years_on(birth: date, on: date) -> int:
    """C7: pełne lata (urodziny = ukończenie). „Do N roku życia” ⇔ age_years_on(...) < N."""
    years = on.year - birth.year
    return years - 1 if add_years(birth, years) > on else years


def add_months(day: date, months: int) -> date:
    """Miesiące kalendarzowe: ten sam dzień miesiąca; brak takiego dnia → ostatni dzień miesiąca (DERIVED, GAP-011)."""
    month_index = day.month - 1 + months
    year, month = day.year + month_index // 12, month_index % 12 + 1
    for last in (31, 30, 29, 28):
        try:
            return date(year, month, min(day.day, last))
        except ValueError:
            continue
    raise ValueError(f"Niepoprawna data: {day} + {months} mies.")
