"""SYMULACJA zaświadczenia o zadłużeniu składkowym (GEN-EXCL-001)."""
import datetime as dt
from decimal import Decimal
from typing import Any

from app.core.params import param
from app.integrations.simulated.common import get_profile, money, sim_id
from app.integrations.simulated.profiles import DemoProfile


class DebtService:
    def certificate(self, profile_id: str, as_of: dt.date, *, amount_override: Decimal | None = None) -> dict[str, Any]:
        profile = get_profile(profile_id)
        amount = amount_override if amount_override is not None else self._amount_on(profile, as_of)
        threshold = param("MIN_WAGE_2026_MONTHLY") * param("DEBT_THRESHOLD_MIN_WAGE_RATIO")
        return {"simulated": True, "certificate_number": sim_id("DEBT", profile_id, as_of, amount),
                "as_of": as_of.isoformat(), "amount": money(amount), "threshold": money(threshold),
                "exceeds_threshold": amount > threshold, "rule_id": "GEN-EXCL-001"}

    @staticmethod
    def _amount_on(profile: DemoProfile, as_of: dt.date) -> Decimal:
        amount = Decimal("0")
        for since, value in sorted(profile.debt_timeline):
            if since <= as_of:
                amount = value
        return amount
