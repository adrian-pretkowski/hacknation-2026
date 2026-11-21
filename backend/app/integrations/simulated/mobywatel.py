"""SYMULACJA logowania (tożsamość). Brak prawdziwego uwierzytelnienia."""
from typing import Any

from app.integrations.simulated.common import get_profile, sim_id
from app.integrations.simulated.profiles import PROFILES


class MObywatelService:
    def login(self, profile_id: str) -> dict[str, Any]:
        profile = get_profile(profile_id)
        return {"simulated": True, "session_token": sim_id("TOKEN", profile_id),
                "profile_id": profile_id, "display_name": profile.display_name, "role": profile.role}

    def list_profiles(self) -> list[dict[str, str]]:
        return [{"profile_id": p.profile_id, "display_name": p.display_name, "role": p.role}
                for p in PROFILES.values()]
