"""SYMULACJA zadania pytania przez PUE/eZUS."""
import datetime as dt
from typing import Any

from app.core.params import param
from app.integrations.simulated.common import get_profile, sim_id


class PueService:
    def ask(self, profile_id: str, topic: str, question: str, *, today: dt.date | None = None) -> dict[str, Any]:
        get_profile(profile_id)
        return {"simulated": True, "ticket_id": sim_id("PUE", profile_id, topic, question, today),
                "status": "RECEIVED", "expected_response_days": param("PAYMENT_DEADLINE_DAYS")}
