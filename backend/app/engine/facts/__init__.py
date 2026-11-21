"""Fakty f_* (zus_rules/07). Interfejs I2: ``from app.engine.facts import Context, fact``."""
from app.engine.facts.registry import Context, fact, get_fact, registered

__all__ = ["Context", "fact", "get_fact", "registered"]
