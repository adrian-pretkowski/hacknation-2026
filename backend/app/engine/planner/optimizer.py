"""Optymalizator planu (BE2-07): najlepszy następny wybór, cofanie o N kroków, eksport grafu decyzji.

Najlepsza kontynuacja z węzła (krok, stan) = programowanie dynamiczne po DAG z ``model.STEPS`` (memoizacja), więc
liczba ocenianych węzłów jest mała, mimo że pełnych ścieżek są dziesiątki tysięcy. Cel:
MAX_MONEY — (kwota, dni opieki), MAX_TIME — (dni opieki, kwota). Remis → pierwsza opcja w kolejności kroku.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from app.core.money import dec_str, round_preview
from app.engine.planner.model import (
    FATHER,
    MOTHER,
    STEPS,
    ZERO,
    Option,
    Outcome,
    Profile,
    State,
    Step,
    Totals,
    money_label,
)

OBJECTIVES = ("MAX_MONEY", "MAX_TIME")


@dataclass(frozen=True)
class Taken:
    step: Step
    option: Option
    outcome: Outcome


class InvalidChoice(ValueError):
    def __init__(self, index: int, step: Step, value: Any, option: Option | None) -> None:
        self.index, self.step, self.value, self.option = index, step, value, option
        reason = option.reason if option else "Wartość spoza dozwolonych opcji kroku."
        super().__init__(f"Krok {index + 1} ({step.id}): {reason}")


class Planner:
    def __init__(self, profile: Profile, objective: str = "MAX_MONEY") -> None:
        if objective not in OBJECTIVES:
            raise ValueError(f"objective musi być jednym z {OBJECTIVES}")
        self.p, self.objective, self.steps = profile, objective, STEPS
        self._best: dict[tuple[int, State], tuple[Totals, tuple[Any, ...]]] = {}

    # ------------------------------------------------------------------------------------------------- rdzeń DP
    def key(self, t: Totals) -> tuple[Any, ...]:
        # przy remisie wolimy plan bez reguł do weryfikacji
        if self.objective == "MAX_TIME":
            return t.covered_days, t.money, -len(t.review_rules)
        return t.money, t.covered_days, -len(t.review_rules)

    def options(self, i: int, state: State) -> list[Option]:
        return self.steps[i].options(self.p, state)

    def best_from(self, i: int, state: State) -> tuple[Totals, tuple[Any, ...]]:
        """Najlepsza suma i wybory dla kroków i..koniec, przy stanie ``state``."""
        memo = self._best.get((i, state))
        if memo is not None:
            return memo
        if i == len(self.steps):
            result: tuple[Totals, tuple[Any, ...]] = (Totals(), ())
        else:
            best: tuple[Totals, tuple[Any, ...]] | None = None
            for opt in self.options(i, state):
                if not opt.feasible:
                    continue
                out = self.steps[i].apply(self.p, state, opt.value)
                future, path = self.best_from(i + 1, out.state)
                total = out.totals + future
                if best is None or self.key(total) > self.key(best[0]):
                    best = (total, (opt.value, *path))
            assert best is not None, f"krok {self.steps[i].id} bez dozwolonej opcji"
            result = best
        self._best[(i, state)] = result
        return result

    def replay(self, choices: list[Any]) -> tuple[list[Taken], State, Totals]:
        """Odtwarza wybory; ``InvalidChoice`` przy wartości spoza domeny albo zablokowanej regułą."""
        state, acc, taken = State(), Totals(), []
        for i, value in enumerate(choices):
            if i >= len(self.steps):
                raise InvalidChoice(i, self.steps[-1], value, None)
            opt = next((o for o in self.options(i, state) if _same(o.value, value)), None)
            if opt is None or not opt.feasible:
                raise InvalidChoice(i, self.steps[i], value, opt)
            out = self.steps[i].apply(self.p, state, opt.value)
            taken.append(Taken(self.steps[i], opt, out))
            state, acc = out.state, acc + out.totals
        return taken, state, acc

    def complete(self, choices: list[Any]) -> list[Any]:
        _, state, _ = self.replay(choices)
        return [*choices, *self.best_from(len(choices), state)[1]]

    # ------------------------------------------------------------------------------------------------ sugestia
    def suggest(self, choices: list[Any], lookback: int = 2) -> dict[str, Any]:
        taken, state, acc = self.replay(choices)
        i = len(choices)
        current_best = self.complete(choices)
        current_total = self.replay(current_best)[2]
        result: dict[str, Any] = {
            "status": "COMPLETE" if i == len(self.steps) else "OK",
            "step_index": i,
            "step": None, "options": [], "recommended": None, "explanation": None,
            "current_best_plan": self.plan(current_best),
            "global_best_plan": self.plan(list(self.best_from(0, State())[1])),
            "backtrack": self._backtrack(choices, taken, current_total, lookback),
        }
        if i == len(self.steps):
            return result
        step = self.steps[i]
        scored = []
        for opt in self.options(i, state):
            entry: dict[str, Any] = {"value": opt.value, "label": opt.label, "feasible": opt.feasible,
                                     "blocked_by_rule": opt.blocked_by, "blocked_reason": opt.reason}
            if opt.feasible:
                out = step.apply(self.p, state, opt.value)
                future, _ = self.best_from(i + 1, out.state)
                total = acc + out.totals + future
                scored.append((opt, total))
                entry.update(_totals_json(total))
            scored_entry = entry
            result["options"].append(scored_entry)
        best_opt, best_total = max(scored, key=lambda pair: self.key(pair[1]))
        for entry in result["options"]:
            if entry["feasible"]:
                loss = best_total.money - Decimal(entry["best_total_exact"])
                entry["loss_vs_best_exact"] = dec_str(loss)
                entry["loss_vs_best_preview"] = dec_str(round_preview(loss))
                entry["recommended"] = _same(entry["value"], best_opt.value)
        result["step"] = step_json(step, i)
        result["step"]["hint"] = step.hint(self.p, state)
        result["recommended"] = best_opt.value
        result["explanation"] = self._explain(step, best_opt, best_total, scored)
        return result

    def _explain(self, step: Step, best: Option, best_total: Totals, scored: list[tuple[Option, Totals]]) -> str:
        others = [(o, t) for o, t in scored if not _same(o.value, best.value)]
        text = f"Rekomendacja: {best.label}. Najlepszy osiągalny plan: {money_label(best_total.money)}"
        text += f", {best_total.covered_days // 7} tyg. opieki."
        if others:
            runner, runner_total = max(others, key=lambda pair: self.key(pair[1]))
            diff = best_total.money - runner_total.money
            days = best_total.covered_days - runner_total.covered_days
            if diff or days:
                text += f" Następna w kolejności opcja („{runner.label}”) daje {money_label(diff)} mniej"
                text += f" i {days} dni opieki mniej." if days > 0 else (
                    f" i {-days} dni opieki więcej." if days < 0 else ".")
            else:
                text += f" Opcja „{runner.label}” daje ten sam wynik."
        if best_total.review_rules:
            text += f" Plan zawiera część do weryfikacji ({', '.join(sorted(best_total.review_rules))})."
        return text

    def _backtrack(self, choices: list[Any], taken: list[Taken], current: Totals, lookback: int) -> list[dict]:
        """Czy zmiana wyboru 1..lookback kroków wstecz (z optymalną resztą) daje lepszy plan niż obecna ścieżka."""
        improvements = []
        for back in range(1, min(lookback, len(choices)) + 1):
            j = len(choices) - back
            prefix_acc = sum((t.outcome.totals for t in taken[:j]), Totals())
            state_j = taken[j - 1].outcome.state if j else State()
            best: tuple[Option, Totals] | None = None
            keep: Totals | None = None  # wybór j bez zmian, reszta optymalnie — zysk z późniejszych kroków
            for opt in self.options(j, state_j):
                if not opt.feasible:
                    continue
                out = self.steps[j].apply(self.p, state_j, opt.value)
                total = prefix_acc + out.totals + self.best_from(j + 1, out.state)[0]
                if _same(opt.value, choices[j]):
                    keep = total
                elif best is None or self.key(total) > self.key(best[1]):
                    best = (opt, total)
            # raportujemy tylko, gdy to zmiana kroku j (a nie samych późniejszych kroków) poprawia plan
            if best is None or keep is None or self.key(best[1]) <= self.key(keep) \
                    or self.key(best[1]) <= self.key(current):
                continue
            opt, total = best
            plan = self.complete([*choices[:j], opt.value])
            improvements.append({
                "steps_back": back, "step_index": j, "step_id": self.steps[j].id,
                "current_value": choices[j], "current_label": taken[j].option.label,
                "suggested_value": opt.value, "suggested_label": opt.label,
                "gain_exact": dec_str(total.money - current.money),
                "gain_preview": dec_str(round_preview(total.money - current.money)),
                "extra_covered_days": total.covered_days - current.covered_days,
                "message": (f"Cofnij się o {back} krok(i) do „{self.steps[j].title}”: "
                            f"zamiast „{taken[j].option.label}” wybierz „{opt.label}” "
                            f"— plan lepszy o {money_label(total.money - current.money)}."),
                "plan": self.plan(plan),
            })
        return improvements

    # ------------------------------------------------------------------------------------------------- wyniki
    def plan(self, choices: list[Any]) -> dict[str, Any]:
        taken, _, total = self.replay(choices)
        items = [i for t in taken for i in t.outcome.items]
        by_parent = {who: sum((i.amount for i in items if i.parent == who), ZERO) for who in (MOTHER, FATHER)}
        return {
            "choices": [{"step_id": t.step.id, "value": t.option.value, "label": t.option.label} for t in taken],
            "items": [{
                "parent": i.parent, "kind": i.kind, "label": i.label, "days": i.days,
                "rate": dec_str(i.rate) if i.rate is not None else None,
                "work_fraction": dec_str(i.work_fraction) if i.work_fraction is not None else None,
                "amount_exact": dec_str(i.amount), "rule_ids": list(i.rule_ids)} for i in items],
            "totals": {**_totals_json(total), "mother_exact": dec_str(by_parent[MOTHER]),
                       "father_exact": dec_str(by_parent[FATHER]),
                       "mother_preview": dec_str(round_preview(by_parent[MOTHER])),
                       "father_preview": dec_str(round_preview(by_parent[FATHER]))},
            "needs_review": bool(total.review_rules),
            "review_rules": sorted(total.review_rules),
        }

    def graph(self, depth: int | None = None) -> dict[str, Any]:
        """Graf decyzji: węzły (krok, stan), krawędzie z zyskiem — także opcje zablokowane regułą.

        ``depth`` ogranicza graf do pierwszych kroków (węzły na głębokości ``depth`` są liśćmi); etykiety opcji są
        w katalogu kroku (``steps[].options``), nie w krawędziach — mniejsza odpowiedź.
        """
        depth = len(self.steps) if depth is None else max(1, min(depth, len(self.steps)))
        catalog: list[dict[str, tuple[Any, str]]] = [{} for _ in self.steps]
        ids: dict[tuple[int, State], str] = {}
        nodes: list[dict[str, Any]] = []
        edges: list[dict[str, Any]] = []
        frontier: list[tuple[int, State]] = []

        def node_id(i: int, state: State) -> str:
            key = (i, state)
            if key not in ids:
                ids[key] = f"n{len(ids)}"
                nodes.append({"id": ids[key], "step_index": i,
                              "step_id": self.steps[i].id if i < len(self.steps) else "END",
                              "state": state.as_dict()})
                if i < depth:
                    frontier.append(key)
            return ids[key]

        node_id(0, State())
        seen: set[tuple[int, State]] = set()
        while frontier:
            i, state = frontier.pop()
            if (i, state) in seen:
                continue
            seen.add((i, state))
            source = ids[(i, state)]
            for opt in self.options(i, state):
                catalog[i].setdefault(repr(opt.value), (opt.value, opt.label))
                edge: dict[str, Any] = {"from": source, "to": None, "step_id": self.steps[i].id, "value": opt.value,
                                        "feasible": opt.feasible, "blocked_by_rule": opt.blocked_by,
                                        "gain_exact": None}
                if opt.feasible:
                    out = self.steps[i].apply(self.p, state, opt.value)
                    edge["to"] = node_id(i + 1, out.state)
                    edge["gain_exact"] = dec_str(out.totals.money)
                    edge["covered_days"] = out.totals.covered_days
                edges.append(edge)
        counts: dict[tuple[int, State], int] = {}

        def paths(i: int, state: State) -> int:
            if i == len(self.steps):
                return 1
            if (i, state) not in counts:
                counts[(i, state)] = sum(paths(i + 1, self.steps[i].apply(self.p, state, o.value).state)
                                         for o in self.options(i, state) if o.feasible)
            return counts[(i, state)]

        return {
            "depth": depth,
            "steps": [{**step_json(s, n), "options": [{"value": v, "label": label} for v, label in catalog[n].values()]}
                      for n, s in enumerate(self.steps[:depth])],
            "nodes": nodes, "edges": edges,
            "stats": {"nodes": len(nodes), "edges": len(edges),
                      "blocked_edges": sum(1 for e in edges if not e["feasible"]),
                      "complete_plans": paths(0, State())},
            "best_plan": self.plan(list(self.best_from(0, State())[1])),
        }


def step_json(step: Step, index: int) -> dict[str, Any]:
    return {"index": index, "id": step.id, "title": step.title, "question": step.question,
            "rule_ids": list(step.rule_ids)}


def _totals_json(t: Totals) -> dict[str, Any]:
    return {"best_total_exact": dec_str(t.money), "best_total_preview": dec_str(round_preview(t.money)),
            "covered_days": t.covered_days, "covered_weeks": t.covered_days // 7, "together_days": t.together_days,
            "needs_review": bool(t.review_rules)}


def _same(a: Any, b: Any) -> bool:
    """Porównanie wyboru z JSON (bool nie jest liczbą; ułamki pracy jako string lub liczba)."""
    if isinstance(a, bool) or isinstance(b, bool):
        return isinstance(a, bool) and isinstance(b, bool) and a == b
    if isinstance(a, str) or isinstance(b, str):
        try:
            return Decimal(str(a)) == Decimal(str(b))
        except ArithmeticError:
            return False
    return a == b
