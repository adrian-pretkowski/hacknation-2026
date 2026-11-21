"""Planer i optymalizator wyborów urlopowych obojga rodziców (BE2-07).

``model.STEPS`` — graf decyzji (kroki, opcje, ograniczenia z 03_rules.yaml); ``optimizer.Planner`` — najlepszy
następny wybór, cofanie o N kroków, eksport grafu. Kwoty liczone deterministycznie (Decimal), bez LLM.
"""
from app.engine.planner.model import STEPS, ParentProfile, Profile, State
from app.engine.planner.optimizer import OBJECTIVES, InvalidChoice, Planner

ENGINE_NAME = "planner-v0"

__all__ = ["ENGINE_NAME", "OBJECTIVES", "STEPS", "InvalidChoice", "ParentProfile", "Planner", "Profile", "State"]
