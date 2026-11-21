"""SYMULACJA wniosku o odpis aktu urodzenia (rejestr stanu cywilnego)."""
import datetime as dt
from typing import Any

from app.integrations.simulated.common import sim_id


class CivilRegistryService:
    INFO_URL = "https://www.gov.pl/web/gov/odpis-aktu-stanu-cywilnego"

    def request_copy(self, birth_date: dt.date, copy_type: str, delivery: str) -> dict[str, Any]:
        note = ("Odpis skrócony wystarcza do wniosku do pracodawcy." if copy_type == "SHORT"
                else "Odpis zupełny - zwykle nie jest wymagany do zasiłku.")
        if delivery == "REGISTRY_OFFICE_PICKUP":
            note += " Odbiór osobisty w urzędzie stanu cywilnego."
        return {"simulated": True, "request_id": sim_id("USC", birth_date, copy_type, delivery),
                "status": "SUBMITTED_SIMULATED", "info_url": self.INFO_URL, "note": note}
