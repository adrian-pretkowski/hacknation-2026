"use client";

// FE1-39: parametry podglądu z API (GET /api/admin/parameters) - zmiana w panelu admina jest widoczna w kreatorze
// bez przebudowy frontendu. Wartości z `params.ts` (kopia 03) zostają tylko jako zapas, gdy API nie odpowiada
// albo działa tryb demo bez backendu.
// FE1-37 (połączone z FE1-39): wartość z API przyjmowana tylko w typie i zakresie kopii - liczby całkowite > 0
// (dni, tygodnie, progi; np. MONTH_AS_DAYS = 0 dałoby dzielenie przez zero), stringi dziesiętne nieujemne,
// tabele z tymi samymi kluczami; inaczej zostaje kopia (panel admina jest otwarty - D36). Przy kilku równoległych
// pobraniach (powrót do karty = visibilitychange + focus) stosowana jest tylko najnowsza odpowiedź.
import { useSyncExternalStore } from "react";
import { API_MODE, listParameters } from "@/lib/api";
import { PARAMS } from "./params";

type Source = "loading" | "api" | "fallback";
let state: { version: number; source: Source } = { version: 0, source: API_MODE === "mock" ? "fallback" : "loading" };
let started = false;
let lastRequest = 0;
const listeners = new Set<() => void>();

const INTEGER = /^-?\d+$/;
const DECIMAL = /^-?\d+(\.\d+)?$/;

/** Wartość z API w typie i zakresie wartości z kopii; `undefined` = odrzucona (zostaje kopia). */
function coerce(current: unknown, incoming: unknown): unknown {
  if (typeof current === "number") {
    const n = typeof incoming === "number" ? incoming
      : typeof incoming === "string" && INTEGER.test(incoming.trim()) ? Number(incoming.trim()) : NaN;
    return Number.isInteger(n) && n > 0 ? n : undefined;
  }
  if (typeof current === "string") {
    const text = typeof incoming === "number" ? String(incoming) : incoming;
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

function apply(values: Record<string, unknown>): void {
  const target = PARAMS as unknown as Record<string, unknown>;
  for (const [name, value] of Object.entries(values)) {
    if (!Object.prototype.hasOwnProperty.call(target, name)) continue;
    const coerced = coerce(target[name], value);
    if (coerced !== undefined) target[name] = coerced;
  }
}

function publish(source: Source): void {
  state = { version: state.version + 1, source };
  listeners.forEach((l) => l());
}

/** Wczytuje parametry z API; wywoływane przy starcie i po powrocie do karty. Tryb mock = bez zmian. */
export function refreshApiParams(): void {
  if (API_MODE === "mock") return;
  const request = ++lastRequest;
  listParameters()
    .then((list) => {
      if (request !== lastRequest) return; // nowsze pobranie w toku - ta odpowiedź jest nieaktualna
      apply(Object.fromEntries(list.parameters.map((p) => [p.name, p.value])));
      publish("api");
    })
    .catch(() => { if (request === lastRequest) publish("fallback"); });
}

function start(): void {
  if (started) return;
  started = true;
  refreshApiParams();
  // powrót do karty (np. po zmianie w panelu admina w innej karcie) → świeże parametry
  const onReturn = () => { if (document.visibilityState === "visible") refreshApiParams(); };
  document.addEventListener("visibilitychange", onReturn);
  window.addEventListener("focus", onReturn);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

const SERVER_STATE: { version: number; source: Source } = { version: 0, source: "loading" };
const snapshot = () => state;
const serverSnapshot = () => SERVER_STATE;

/** Wersja parametrów podglądu (zmienia się po wczytaniu z API) i ich źródło. */
export function useApiParams(): { version: number; source: Source } {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
