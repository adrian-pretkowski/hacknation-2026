"""Syntetyczne profile demo (INT-03). Dane fikcyjne - nie pochodzą z systemów ZUS ani gov.

Profil opisuje „stan konta" osoby; serwisy w `services.py` budują z niego odpowiedzi i pozwalają
nadpisać wybrane elementy (zdarzenie, liczba ubezpieczonych u płatnika, dług, e-ZLA), żeby dało się
odtworzyć różne scenariusze bez nowych plików danych.
"""
import datetime as dt
from copy import deepcopy
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

D = dt.date


@dataclass(frozen=True)
class Certificate:
    certificate_id: str
    issued_at: dt.date
    from_: dt.date
    to: dt.date
    codes: tuple[str, ...] = ("B",)  # B = niezdolność w ciąży


@dataclass(frozen=True)
class DemoProfile:
    profile_id: str
    display_name: str
    role: str  # MOTHER | FATHER | ...
    titles: tuple[dict[str, Any], ...]
    event: dict[str, Any]
    children: dict[str, Any]
    payer: dict[str, Any]
    income_history: dict[str, Any]
    benefit_history: dict[str, Any] = field(default_factory=dict)
    # saldo zadłużenia składkowego w czasie: (od daty, kwota) - obowiązuje ostatni wpis <= as_of
    debt_timeline: tuple[tuple[dt.date, Decimal], ...] = ()
    certificates: tuple[Certificate, ...] = ()

    def data(self) -> dict[str, Any]:
        """Fragment wejścia silnika (`EvaluateRequest`) - kopia, bezpieczna do modyfikacji."""
        return deepcopy({
            "person": {"role": self.role},
            "insurance": {"titles": list(self.titles)},
            "event": self.event,
            "children": self.children,
            "payer": self.payer,
            "income_history": self.income_history,
            "benefit_history": self.benefit_history,
        })


def _title(kind: str, mode: str, start: dt.date, end: dt.date | None = None) -> dict[str, Any]:
    return {"title_type": kind, "sickness_insurance_mode": mode, "from": start.isoformat(),
            "to": end.isoformat() if end else None}


_PROFILES = [
    # Pracownica, stały etat, płatnik > 20 ubezpieczonych (wypłaca pracodawca), bez długu.
    DemoProfile(
        "employee_mother", "Anna Przykładowa", "MOTHER",
        (_title("EMPLOYMENT_CONTRACT", "MANDATORY", D(2022, 2, 1)),),
        {"type": "BIRTH", "date": "2027-03-15"}, {"count_at_birth": 1},
        {"insured_count_on_nov30_prev_year": 85, "payer_name": "Firma Demo Sp. z o.o."},
        {"manual_base_override": "6000.00"},
        certificates=(Certificate("EZLA-SIM-0001", D(2026, 12, 1), D(2026, 12, 1), D(2027, 1, 14)),
                      Certificate("EZLA-SIM-0002", D(2027, 1, 15), D(2027, 1, 15), D(2027, 3, 14))),
    ),
    # JDG z dobrowolnym chorobowym i zaległością składkową - blokuje prawo (GEN-EXCL-001).
    DemoProfile(
        "self_employed_debt", "Joanna Działalna", "MOTHER",
        (_title("SELF_EMPLOYED", "VOLUNTARY", D(2025, 1, 10)),),
        {"type": "BIRTH", "date": "2027-05-20"}, {"count_at_birth": 1},
        {"insured_count_on_nov30_prev_year": 1, "payer_name": "Joanna Działalna (JDG)"},
        {"manual_base_override": "5200.00"},
        debt_timeline=((D(2027, 1, 1), Decimal("0.00")), (D(2027, 2, 1), Decimal("430.50"))),
        certificates=(Certificate("EZLA-SIM-0101", D(2027, 3, 1), D(2027, 3, 1), D(2027, 4, 30)),),
    ),
    # Ojciec przejmujący część urlopu po matce; małe przedsiębiorstwo (płatnik ≤ 20 → ZUS).
    DemoProfile(
        "father_takeover", "Piotr Przykładowy", "FATHER",
        (_title("EMPLOYMENT_CONTRACT", "MANDATORY", D(2020, 9, 1)),),
        {"type": "BIRTH", "date": "2027-03-15"}, {"count_at_birth": 1},
        {"insured_count_on_nov30_prev_year": 12, "payer_name": "Mały Zakład Demo"},
        {"manual_base_override": "7400.00"},
    ),
    # Dobrowolne chorobowe opłacane krótko - nie spełnia okresu wyczekiwania (90 dni).
    DemoProfile(
        "voluntary_short_waiting", "Katarzyna Krótka", "MOTHER",
        (_title("SELF_EMPLOYED", "VOLUNTARY", D(2027, 1, 5)),),
        {"type": "BIRTH", "date": "2027-04-10"}, {"count_at_birth": 1},
        {"insured_count_on_nov30_prev_year": 1},
        {"manual_base_override": "4500.00"},
    ),
    # Przerwa w ubezpieczeniu > 30 dni przed zdarzeniem (INSURANCE_GAP_MAX_DAYS).
    DemoProfile(
        "gap_in_insurance", "Marta Przerwana", "MOTHER",
        (_title("EMPLOYMENT_CONTRACT", "MANDATORY", D(2024, 1, 1), D(2026, 6, 30)),
         _title("EMPLOYMENT_CONTRACT", "MANDATORY", D(2026, 10, 1))),
        {"type": "BIRTH", "date": "2027-02-01"}, {"count_at_birth": 1},
        {"insured_count_on_nov30_prev_year": 40},
        {"manual_base_override": "5000.00"},
    ),
    # Ciąża bliźniacza, pracownica (dłuższy wymiar urlopu), duży płatnik.
    DemoProfile(
        "twins_employee", "Ewa Podwójna", "MOTHER",
        (_title("EMPLOYMENT_CONTRACT", "MANDATORY", D(2021, 6, 1)),),
        {"type": "BIRTH", "date": "2027-06-01"}, {"count_at_birth": 2},
        {"insured_count_on_nov30_prev_year": 250},
        {"manual_base_override": "8000.00"},
    ),
    # Adopcja, ojciec, płatnik mały.
    DemoProfile(
        "adoptive_father", "Tomasz Adopcyjny", "ADOPTIVE_PARENT",
        (_title("EMPLOYMENT_CONTRACT", "MANDATORY", D(2019, 3, 1)),),
        {"type": "ADOPTION", "date": "2027-02-10"}, {"count_at_birth": 1},
        {"insured_count_on_nov30_prev_year": 18},
        {"manual_base_override": "6800.00"},
    ),
]

PROFILES: dict[str, DemoProfile] = {p.profile_id: p for p in _PROFILES}
