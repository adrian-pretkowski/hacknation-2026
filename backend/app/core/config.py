"""Konfiguracja z zmiennych środowiskowych (nazwy w .env.example)."""
import os
from functools import lru_cache
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings:
    def __init__(self) -> None:
        self.rules_path = Path(os.environ.get("ZUS_RULES_PATH", REPO_ROOT / "zus_rules" / "03_rules.yaml"))
        origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
        self.cors_origins = [o.strip() for o in origins.split(",") if o.strip()]
        self.law_reference_date = os.environ.get("LAW_REFERENCE_DATE", "2026-11-21")


@lru_cache
def get_settings() -> Settings:
    return Settings()
