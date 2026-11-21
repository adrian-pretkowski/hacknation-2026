"""SYMULACJA podglądu zaświadczeń lekarskich e-ZLA."""
import datetime as dt
from typing import Any

from app.integrations.simulated.common import get_profile, sim_id, to_date
from app.integrations.simulated.profiles import Certificate


class EzlaService:
    def list_certificates(self, profile_id: str, *, overlapping: tuple[dt.date, dt.date] | None = None,
                          code: str | None = None) -> dict[str, Any]:
        """Lista zaświadczeń; filtry: nakładanie na okres `[from, to]` i kod (np. B — ciąża)."""
        certs = [c for c in get_profile(profile_id).certificates
                 if (overlapping is None or (c.from_ <= overlapping[1] and c.to >= overlapping[0]))
                 and (code is None or code in c.codes)]
        return {"simulated": True, "certificates": [self._dump(c) for c in certs]}

    def issue_pregnancy_leave(self, profile_id: str, from_: dt.date, to: dt.date) -> dict[str, Any]:
        """Scenariusz: lekarz wystawia nowe e-ZLA z kodem B (zwraca zaświadczenie, nie zmienia profilu)."""
        if to < from_:
            raise ValueError("to wcześniej niż from")
        return self._dump(Certificate(sim_id("EZLA", profile_id, from_, to), from_, from_, to, ("B",)))

    @staticmethod
    def pregnancy_days(certs: list[dict[str, Any]]) -> int:
        """Suma dni (włącznie) zaświadczeń z kodem B — pomocnicza do scenariuszy 270 dni."""
        return sum((to_date(c["to"]) - to_date(c["from"])).days + 1 for c in certs if "B" in c["codes"])

    @staticmethod
    def _dump(c: Certificate) -> dict[str, Any]:
        return {"certificate_id": c.certificate_id, "issued_at": c.issued_at.isoformat(),
                "from": c.from_.isoformat(), "to": c.to.isoformat(), "codes": list(c.codes)}
