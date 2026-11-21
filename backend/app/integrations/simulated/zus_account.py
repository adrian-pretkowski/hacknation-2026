"""SYMULACJA danych z konta ubezpieczonego (ubezpieczenie, płatnik, podstawa, zdarzenie)."""
import datetime as dt
from decimal import Decimal
from typing import Any

from app.core.params import param
from app.integrations.simulated.common import get_profile, money, to_date


class ZusAccountService:
    def get_profile(self, profile_id: str, *, event_date: dt.date | None = None,
                    event_type: str | None = None, payer_insured_count: int | None = None,
                    base_override: Decimal | None = None, children_count: int | None = None,
                    titles: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """Dane profilu; nadpisania tworzą scenariusz „co jeśli" (np. mały płatnik → ZUS)."""
        data = get_profile(profile_id).data()
        if event_date:
            data["event"]["date"] = event_date.isoformat()
        if event_type:
            data["event"]["type"] = event_type
        if payer_insured_count is not None:
            data["payer"]["insured_count_on_nov30_prev_year"] = payer_insured_count
        if base_override is not None:
            data["income_history"]["manual_base_override"] = money(base_override)
        if children_count is not None:
            data["children"]["count_at_birth"] = children_count
        if titles is not None:
            data["insurance"]["titles"] = titles
        return {"simulated": True, "profile_id": profile_id, "data": data}

    def payer_of_benefit(self, profile_id: str, *, insured_count: int | None = None) -> str:
        """Kto wypłaca zasiłek wg progu z `PAYER_INSURED_THRESHOLD` (>próg → płatnik, inaczej ZUS)."""
        count = insured_count if insured_count is not None else \
            get_profile(profile_id).payer["insured_count_on_nov30_prev_year"]
        return "CONTRIBUTION_PAYER" if count > param("PAYER_INSURED_THRESHOLD") else "ZUS"

    def has_insurance_on(self, profile_id: str, day: dt.date) -> bool:
        """Czy któryś tytuł obejmuje dzień (weryfikacja ubezpieczenia na dzień porodu)."""
        for t in get_profile(profile_id).titles:
            start = to_date(t["from"])
            end = to_date(t["to"]) if t["to"] else None
            if t["sickness_insurance_mode"] != "NONE" and start <= day and (end is None or day <= end):
                return True
        return False
