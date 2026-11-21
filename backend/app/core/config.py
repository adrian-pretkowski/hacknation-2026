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
        # ENGINE=rules (pipeline z 03_rules.yaml, domyślnie) | slice (tymczasowy slice_v0) - BE1-02
        # Wersja aplikacji wstrzykiwana z tagu przy buildzie (INT-11); lokalnie "dev".
        self.app_version = os.environ.get("APP_VERSION", "dev").strip() or "dev"
        self.engine = os.environ.get("ENGINE", "rules").strip().lower()
        if self.engine not in ("rules", "slice"):
            raise ValueError(f"ENGINE musi być 'rules' albo 'slice', jest {self.engine!r}")
        # BE2-05: panel admina parametrów - token nagłówka X-Admin-Token (brak → endpointy admina zwracają 401)
        self.admin_token = os.environ.get("ADMIN_TOKEN", "").strip() or None
        self.param_overrides_path = Path(os.environ.get(
            "PARAM_OVERRIDES_PATH", REPO_ROOT / "backend" / "data" / "parameter_overrides.json"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
