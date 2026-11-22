// Klient API zgodny z contracts/openapi.yaml (typy generowane: npm run gen:api).
// Tryb mock (NEXT_PUBLIC_API_MODE=mock) jest oddzielony od klienta realnego i zawsze sygnalizowany banerem w UI.
import type { components } from "./api-types";
import evaluateMock from "../mocks/evaluate.eligible.json";

export type EvaluateRequest = components["schemas"]["EvaluateRequest"];
export type EvaluateResponse = components["schemas"]["EvaluateResponse"];
export type Benefit = components["schemas"]["Benefit"];
export type Problem = components["schemas"]["Problem"];
export type PlannerSuggestRequest = components["schemas"]["PlannerSuggestRequest"];
export type PlannerSuggestResponse = components["schemas"]["PlannerSuggestResponse"];
export type PlannerPlan = components["schemas"]["PlannerPlan"];
export type PlannerChoice = components["schemas"]["PlannerChoice"];

export const API_MODE = process.env.NEXT_PUBLIC_API_MODE === "mock" ? "mock" : "real";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public readonly problem: Problem | null, message: string) {
    super(message);
  }
}

export async function evaluate(request: EvaluateRequest): Promise<EvaluateResponse> {
  if (API_MODE === "mock") {
    return evaluateMock as EvaluateResponse;
  }
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new ApiError(null, `Brak połączenia z API (${API_URL}). Czy backend jest uruchomiony?`);
  }
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as Problem | null;
    throw new ApiError(problem, problem?.title ?? `Błąd API: HTTP ${response.status}`);
  }
  return (await response.json()) as EvaluateResponse;
}

// Planer urlopów (BE2-07): najlepszy następny wybór + cofanie. Wymaga backendu - w trybie mock zwraca błąd z opisem.
export async function plannerSuggest(request: PlannerSuggestRequest): Promise<PlannerSuggestResponse> {
  if (API_MODE === "mock") {
    throw new ApiError(null, "Planer wymaga działającego API - w trybie demo (bez backendu) jest niedostępny.");
  }
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/planner/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new ApiError(null, `Brak połączenia z API (${API_URL}). Czy backend jest uruchomiony?`);
  }
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as Problem | null;
    throw new ApiError(problem, problem?.title ?? `Błąd API: HTTP ${response.status}`);
  }
  return (await response.json()) as PlannerSuggestResponse;
}

export type Health = components["schemas"]["Health"];

/** Wersja frontendu - wstrzykiwana z tagu przy buildzie (INT-11); lokalnie „dev”. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "dev";

export async function getHealth(): Promise<Health | null> {
  if (API_MODE === "mock") return null;
  try {
    const response = await fetch(`${API_URL}/api/health`);
    return response.ok ? ((await response.json()) as Health) : null;
  } catch {
    return null;
  }
}

// Panel admina parametrów (BE2-05, FE1-03, BE2-13): GET/PUT/DELETE /api/admin/parameters - demo, bez tokenu.
export type Parameter = components["schemas"]["Parameter"];
export type ParameterList = components["schemas"]["ParameterList"];
export type ParameterUpdate = components["schemas"]["ParameterUpdate"];

async function adminCall(init?: { method: "PUT"; body: ParameterUpdate } | { method: "DELETE" }): Promise<ParameterList> {
  if (API_MODE === "mock") {
    throw new ApiError(null, "Panel admina wymaga działającego API - w trybie demo (bez backendu) jest niedostępny.");
  }
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/admin/parameters`, {
      method: init?.method ?? "GET",
      headers: init?.method === "PUT" ? { "Content-Type": "application/json" } : undefined,
      body: init?.method === "PUT" ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(null, `Brak połączenia z API (${API_URL}). Czy backend jest uruchomiony?`);
  }
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as Problem | null;
    throw new ApiError(problem, problem?.detail ?? problem?.title ?? `Błąd API: HTTP ${response.status}`);
  }
  return (await response.json()) as ParameterList;
}

export const listParameters = () => adminCall();
export const updateParameters = (body: ParameterUpdate) => adminCall({ method: "PUT", body });
/** Usuwa wszystkie nadpisania - wartości z zus_rules (BE2-13). */
export const resetParameters = () => adminCall({ method: "DELETE" });

// Przykładowe wnioski (BE2-06): lista, ewaluacja z porównaniem do decyzji, upload PDF. Wymaga backendu.
export type CaseList = components["schemas"]["CaseList"];
export type CaseSummary = components["schemas"]["CaseSummary"];
export type CaseEvaluation = components["schemas"]["CaseEvaluation"];
export type CaseUploadResult = components["schemas"]["CaseUploadResult"];

async function casesCall<T>(path: string, init?: RequestInit): Promise<T> {
  if (API_MODE === "mock") {
    throw new ApiError(null, "Przykładowe wnioski wymagają działającego API - w trybie demo (bez backendu) są niedostępne.");
  }
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError(null, `Brak połączenia z API (${API_URL}). Czy backend jest uruchomiony?`);
  }
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as Problem | null;
    throw new ApiError(problem, problem?.detail ?? problem?.title ?? `Błąd API: HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export const listCases = () => casesCall<CaseList>("/api/cases");
export const evaluateCase = (caseId: string) =>
  casesCall<CaseEvaluation>(`/api/cases/${encodeURIComponent(caseId)}/evaluate`, { method: "POST" });
export function uploadCase(file: File): Promise<CaseUploadResult> {
  const form = new FormData();
  form.append("file", file);
  return casesCall<CaseUploadResult>("/api/cases/upload", { method: "POST", body: form });
}
