"use client";

// FE1-37: kreator liczy podgląd na wartościach z panelu admina. Przy starcie i po powrocie do karty pobiera
// GET /api/admin/parameters (wartości obowiązujące dziś) i nadpisuje nimi lokalną kopię `PARAMS` - tylko znane klucze
// i tylko w tym samym typie (liczba całkowita / string dziesiętny / tabela z tymi samymi kluczami). Wartość w innym
// typie albo brak API (tryb mock, błąd sieci) = zostaje kopia z params.ts, więc kreator działa jak dotąd.
// Komponenty czytające `PARAMS` w renderze subskrybują `useParamsVersion()` i przeliczają się po zmianie.
import { useEffect, useSyncExternalStore } from "react";
import { API_MODE, type Parameter, listParameters } from "@/lib/api";
import { PARAMS } from "./params";

const INTEGER = /^-?\d+$/;
const DECIMAL = /^-?\d+(\.\d+)?$/;

let version = 0;
const listeners = new Set<() => void>();

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const snapshot = () => version;

/** Wersja parametrów podglądu - zmienia się po każdej skutecznej podmianie wartości z API. */
export function useParamsVersion(): number {
  return useSyncExternalStore(subscribe, snapshot, () => 0);
}

/** Wartość z API w typie wartości z kopii; `undefined` = niezgodny typ lub zakres (zostaje kopia).
 *
 * Zakres (panel admina jest otwarty - D36): liczby całkowite w podglądzie to dni, tygodnie, progi i liczniki - muszą
 * być > 0 (np. MONTH_AS_DAYS = 0 dałoby dzielenie przez zero przy renderze wyniku); stawki i kwoty nie mogą być ujemne.
 */
function coerce(current: unknown, incoming: unknown): unknown {
  if (typeof current === "number") {
    const n = typeof incoming === "number" ? incoming
      : typeof incoming === "string" && INTEGER.test(incoming.trim()) ? Number(incoming.trim()) : NaN;
    return Number.isInteger(n) && n > 0 ? n : undefined;
  }
  if (typeof current === "string") {
    const text = (typeof incoming === "number" ? String(incoming) : incoming);
    return typeof text === "string" && DECIMAL.test(text.trim()) && !text.trim().startsWith("-") ? text.trim() : undefined;
  }
  if (current && typeof current === "object" && !Array.isArray(current)) {
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return undefined;
    const base = current as Record<string, unknown>;
    const next = incoming as Record<string, unknown>;
    const keys = Object.keys(base);
    if (keys.length !== Object.keys(next).length || !keys.every((k) => k in next)) return undefined;
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      const v = coerce(base[k], next[k]);
      if (v === undefined) return undefined;
      out[k] = v;
    }
    return out;
  }
  return undefined;
}

/** Podmienia znane parametry w `PARAMS`; zwraca true, gdy coś się zmieniło (wtedy rośnie wersja). */
export function applyParameters(list: Parameter[]): boolean {
  const target = PARAMS as unknown as Record<string, unknown>;
  let changed = false;
  for (const p of list) {
    if (!Object.prototype.hasOwnProperty.call(target, p.name)) continue;
    const value = coerce(target[p.name], p.value);
    if (value === undefined || JSON.stringify(value) === JSON.stringify(target[p.name])) continue;
    target[p.name] = value;
    changed = true;
  }
  if (changed) {
    version += 1;
    listeners.forEach((l) => l());
  }
  return changed;
}

let lastRequest = 0;

/** Pobiera parametry z API i podmienia je w podglądzie; błąd lub tryb mock = bez zmian.
 *  Przy kilku równoległych pobraniach (powrót do karty = visibilitychange + focus) stosuje tylko najnowsze. */
export async function refreshLiveParams(): Promise<boolean> {
  if (API_MODE === "mock") return false;
  const request = ++lastRequest;
  try {
    const list = await listParameters();
    return request === lastRequest ? applyParameters(list.parameters) : false;
  } catch {
    return false;
  }
}

/** Wczytanie przy starcie i po powrocie do karty (np. po zmianie w panelu admina w drugiej karcie). */
export function useLiveParamsRefresh(): void {
  useEffect(() => {
    void refreshLiveParams();
    const onReturn = () => { if (document.visibilityState === "visible") void refreshLiveParams(); };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, []);
}
