// SYMULACJA usług zewnętrznych - lokalny mock endpointów /api/sim/* z contracts/openapi.yaml (x-status: planned, INT-03).
// Kształty odpowiedzi zgodne z kontraktem (SimLoginResponse, SimEzlaList, SimDebtCertificate, SimPueTicket, każda ma simulated: true).
// Po wdrożeniu INT-03 funkcje zastąpi klient z lib/api.ts. Żadnego połączenia z ZUS ani z aplikacją rządową.
import type { components } from "@/lib/api-types";
import { PARAMS } from "../main-flow/preview/params";
import { type TestUser, findUser, fullName } from "./users";

const DELAY_MS = 600;
const wait = <T,>(value: T, ms = DELAY_MS) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

/** Dzisiejsza data w strefie lokalnej (nie UTC), format RRRR-MM-DD. */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Opis wykorzystanych urlopów budowany z danych profilu. */
export function usedLeaveText(p: { usedMaternityFully?: string; usedParentalMotherWeeks?: string; usedParts?: string; usedVariant?: string }): string {
  const parts = [p.usedMaternityFully === "YES" ? "macierzyński w całości" : "macierzyński nie w całości"];
  const w = Number(p.usedParentalMotherWeeks ?? "0");
  if (w > 0) parts.push(`rodzicielski ${w} tyg. (części: ${p.usedParts ?? "?"}${p.usedVariant === "FULL_100_70" ? ", wariant 100% / 70%" : p.usedVariant === "COMBINED_815" ? ", wariant 81,5%" : ""})`);
  return parts.join(", ");
}

function seq(seed: string): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Iloczyn dwóch liczb dziesiętnych zapisanych jako string - bez float (BigInt na skalach). Wynik z 2 miejscami (obcięcie). */
function mulDecimal(a: string, b: string): string {
  const parse = (s: string) => {
    const [i, f = ""] = s.split(".");
    return { n: BigInt(i + f), scale: f.length };
  };
  const x = parse(a);
  const y = parse(b);
  const raw = x.n * y.n;
  const scale = x.scale + y.scale;
  const cents = scale >= 2 ? raw / BigInt(10) ** BigInt(scale - 2) : raw * BigInt(10) ** BigInt(2 - scale);
  const s = cents.toString().padStart(3, "0");
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
}

function cmpDecimal(a: string, b: string): number {
  const cents = (s: string) => {
    const [i, f = ""] = s.split(".");
    return BigInt(i + (f + "00").slice(0, 2));
  };
  const d = cents(a) - cents(b);
  return d > BigInt(0) ? 1 : d < BigInt(0) ? -1 : 0;
}

// Typy wprost z kontraktu (npm run gen:api) - mock nie może rozjechać się z openapi.yaml.
type S = components["schemas"];
export type SimLoginResponse = S["SimLoginResponse"];
export type SimEzla = S["SimEzla"];
export type SimEzlaList = S["SimEzlaList"];
export type SimDebtCertificate = S["SimDebtCertificate"];
export type SimPueTopic = S["SimPueQuestion"]["topic"];
export type SimPueTicket = S["SimPueTicket"];

function requireUser(profileId: string): TestUser {
  const u = findUser(profileId);
  if (!u) throw new Error("Nieznany profil testowy");
  return u;
}

/** POST /api/sim/mobywatel/login (SYMULACJA). */
export function simLogin(profileId: string): Promise<SimLoginResponse> {
  const u = requireUser(profileId);
  return wait({ simulated: true, session_token: `sym-${u.id}-${Date.now().toString(36)}`, profile_id: u.id, display_name: fullName(u), role: u.role });
}

/** GET /api/sim/ezla (SYMULACJA). */
export function simEzla(profileId: string): Promise<SimEzlaList> {
  return wait({ simulated: true, certificates: requireUser(profileId).ezla });
}

/** GET /api/sim/debt-certificate (SYMULACJA). Próg = minimalne wynagrodzenie × współczynnik z parametrów (reguła GEN-EXCL-001). */
export function simDebtCertificate(profileId: string, asOf: string): Promise<SimDebtCertificate> {
  const u = requireUser(profileId);
  const threshold = mulDecimal(PARAMS.MIN_WAGE_2026_MONTHLY, PARAMS.DEBT_THRESHOLD_MIN_WAGE_RATIO);
  return wait({
    simulated: true,
    certificate_number: `SYM/ZAS/${asOf.slice(0, 4)}/${String(seq(u.id + asOf) % 1000000).padStart(6, "0")}`,
    as_of: asOf,
    amount: u.debt,
    threshold,
    exceeds_threshold: cmpDecimal(u.debt, threshold) > 0,
    rule_id: "GEN-EXCL-001",
  });
}

/** POST /api/sim/pue-question (SYMULACJA). */
export function simPueQuestion(profileId: string, topic: SimPueTopic, question: string): Promise<SimPueTicket> {
  requireUser(profileId);
  const n = seq(profileId + topic + question + Date.now()) % 100000;
  return wait({ simulated: true, ticket_id: `SYM-PUE-${String(n).padStart(5, "0")}`, status: "RECEIVED", expected_response_days: 3 });
}
