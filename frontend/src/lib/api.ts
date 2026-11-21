// Klient API zgodny z contracts/openapi.yaml (typy generowane: npm run gen:api).
// Tryb mock (NEXT_PUBLIC_API_MODE=mock) jest oddzielony od klienta realnego i zawsze sygnalizowany banerem w UI.
import type { components } from "./api-types";
import evaluateMock from "../mocks/evaluate.eligible.json";

export type EvaluateRequest = components["schemas"]["EvaluateRequest"];
export type EvaluateResponse = components["schemas"]["EvaluateResponse"];
export type Benefit = components["schemas"]["Benefit"];
export type Problem = components["schemas"]["Problem"];

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
