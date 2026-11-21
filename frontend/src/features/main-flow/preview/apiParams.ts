"use client";

// FE1-37: parametry podglądu z API (GET /api/admin/parameters) - zmiana w panelu admina jest widoczna w kreatorze
// bez przebudowy frontendu. Wartości z `params.ts` (kopia 03) zostają tylko jako zapas, gdy API nie odpowiada
// albo działa tryb demo bez backendu. Typ każdej wartości musi zgadzać się z kopią (liczba / tekst / tabela).
import { useSyncExternalStore } from "react";
import { API_MODE, listParameters } from "@/lib/api";
import { PARAMS } from "./params";

type Source = "loading" | "api" | "fallback";
let state: { version: number; source: Source } = { version: 0, source: API_MODE === "mock" ? "fallback" : "loading" };
let started = false;
const listeners = new Set<() => void>();

const sameShape = (current: unknown, next: unknown) =>
  next !== null && next !== undefined && typeof current === typeof next && Array.isArray(current) === Array.isArray(next);

function apply(values: Record<string, unknown>): void {
  const target = PARAMS as unknown as Record<string, unknown>;
  for (const [name, value] of Object.entries(values)) {
    if (name in target && sameShape(target[name], value)) target[name] = value;
  }
}

function publish(source: Source): void {
  state = { version: state.version + 1, source };
  listeners.forEach((l) => l());
}

/** Wczytuje parametry z API raz na sesję strony; `refreshApiParams()` wymusza ponowny odczyt. */
export function refreshApiParams(): void {
  if (API_MODE === "mock") return;
  started = true;
  listParameters()
    .then((list) => {
      apply(Object.fromEntries(list.parameters.map((p) => [p.name, p.value])));
      publish("api");
    })
    .catch(() => publish("fallback"));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!started) {
    refreshApiParams();
    // powrót do karty (np. po zmianie w panelu admina w innej karcie) → świeże parametry
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refreshApiParams(); });
  }
  return () => listeners.delete(listener);
}

const SERVER_STATE: { version: number; source: Source } = { version: 0, source: "loading" };
const snapshot = () => state;
const serverSnapshot = () => SERVER_STATE;

/** Wersja parametrów podglądu (zmienia się po wczytaniu z API) i ich źródło. */
export function useApiParams(): { version: number; source: Source } {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
