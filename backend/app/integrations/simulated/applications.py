"""SYMULACJA złożenia wniosku (ZAM lub urlopowego)."""
import datetime as dt
from collections.abc import Callable
from typing import Any

from app.core.params import param
from app.integrations.simulated.common import get_profile, sim_id, to_date

# Załączniki wymagane wg typu wniosku i adresata (kody jak w zus_rules/07 § 7; ROZP_DOK § 13 ust. 2:
# przy płatniku-ZUS odpis aktu urodzenia nie jest wymagany).
_REQUIRED: dict[tuple[str, str], tuple[str, ...]] = {
    ("ZAM", "ZUS"): ("MATERNITY_APPLICATION_ANNEX6", "PAYER_CERTIFICATE_Z3_OR_Z3A"),
    ("ZAM", "EMPLOYER"): ("BIRTH_CERTIFICATE_SHORT",),
    ("LEAVE_PARENTAL", "EMPLOYER"): ("BIRTH_CERTIFICATE_SHORT",),
    ("LEAVE_PATERNITY", "EMPLOYER"): ("BIRTH_CERTIFICATE_SHORT",),
    ("LEAVE_MATERNITY_LIKE", "EMPLOYER"): ("BIRTH_CERTIFICATE_SHORT",),
}


class ApplicationService:
    def __init__(self, today: Callable[[], dt.date] = dt.date.today) -> None:
        self._today = today

    def submit(self, profile_id: str, application_type: str, recipient: str, *,
               planned_start: dt.date | None = None, fields: dict[str, Any] | None = None,
               attachments: list[str] | None = None, submitted_on: dt.date | None = None,
               event_date: dt.date | None = None) -> dict[str, Any]:
        profile = get_profile(profile_id)
        submitted = submitted_on or self._today()
        required = _REQUIRED.get((application_type, recipient), ())
        missing = [code for code in required if code not in (attachments or [])]
        event = event_date or to_date(profile.event["date"])
        return {"simulated": True,
                "application_id": sim_id("APP", profile_id, application_type, recipient, planned_start, submitted),
                "status": "SUBMITTED_SIMULATED", "recipient": recipient,
                "deadline_check": self._deadline(application_type, event, submitted),
                "missing_attachments": missing}

    @staticmethod
    def _deadline(application_type: str, event: dt.date, submitted: dt.date) -> dict[str, Any] | None:
        """Termin tylko tam, gdzie jest w parametrach: ZAM (wniosek łączony 81,5%) - art. 30a."""
        if application_type != "ZAM":
            return None
        deadline = event + dt.timedelta(days=param("APP_COMBINED_DEADLINE_DAYS"))
        return {"ok": submitted <= deadline, "deadline": deadline.isoformat(), "rule_id": "APP-DL-001"}
