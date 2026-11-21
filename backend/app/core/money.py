"""Kwoty - konwencje C1–C2 z zus_rules/07_CALCULATION_SPEC.md.

C1: decimal.Decimal, precyzja 28, bez zaokrągleń pośrednich (wynik *_exact).
C2: polityka zaokrągleń nieustalona (GAP-001) - round_preview() tylko do podglądu w UI.
"""
from __future__ import annotations

from decimal import ROUND_HALF_UP, Context, Decimal, localcontext
from typing import Any

PRECISION = 28
_CTX = Context(prec=PRECISION)


def to_decimal(value: Any) -> Decimal | None:
    """Bezpieczna konwersja do Decimal (float przez str, by nie przenosić błędu binarnego). None/'' → None."""
    if value is None or value == "":
        return None
    if isinstance(value, Decimal):
        return value
    if isinstance(value, bool):
        raise TypeError("bool nie jest kwotą")
    return Decimal(str(value))


def mul(*factors: Decimal) -> Decimal:
    with localcontext(_CTX):
        result = Decimal(1)
        for factor in factors:
            result *= factor
        return result


def div(numerator: Decimal, denominator: Decimal | int) -> Decimal:
    with localcontext(_CTX):
        return numerator / Decimal(denominator)


def dec_str(value: Decimal) -> str:
    """Dokładna wartość bez notacji wykładniczej i zbędnych zer (format API *_exact)."""
    return format(value.normalize(), "f")


def round_to_step(value: Decimal, step: Decimal) -> Decimal:
    """Zaokrąglenie ROUND_HALF_UP do kroku z parametru (np. 0,01 zł) - tylko tam, gdzie reguła je przewiduje (M07a)."""
    return value.quantize(step, rounding=ROUND_HALF_UP)


def round_preview(value: Decimal) -> Decimal:
    """Podgląd do 0,01 zł ROUND_HALF_UP - wymaga assumption ROUNDING_UNCONFIRMED (C2, GAP-001)."""
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
