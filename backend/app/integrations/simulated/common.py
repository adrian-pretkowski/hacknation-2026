"""Wspólne pomocniki symulowanych systemów (INT-03)."""
import datetime as dt
import hashlib
from decimal import Decimal

from app.integrations.simulated.profiles import PROFILES, DemoProfile


class UnknownProfileError(KeyError):
    """Brak profilu demo o podanym identyfikatorze."""


def get_profile(profile_id: str) -> DemoProfile:
    try:
        return PROFILES[profile_id]
    except KeyError:
        raise UnknownProfileError(profile_id) from None


def sim_id(prefix: str, *parts: object) -> str:
    """Deterministyczny identyfikator (te same dane → ten sam numer; stabilne testy)."""
    digest = hashlib.sha1("|".join(str(p) for p in parts).encode()).hexdigest()[:8].upper()
    return f"{prefix}-SIM-{digest}"


def money(value: Decimal) -> str:
    return format(value.quantize(Decimal("0.01")), "f")


def to_date(value: str | dt.date) -> dt.date:
    return value if isinstance(value, dt.date) else dt.date.fromisoformat(value)
