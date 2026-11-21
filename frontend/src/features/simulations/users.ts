// SYMULACJA - fikcyjni użytkownicy testowi do demonstracji logowania i pobierania danych.
// Wszystkie osoby, daty i kwoty są wymyślone; nie odpowiadają żadnej rzeczywistej osobie ani sprawie ZUS.
// Identyfikatory = ProfileId z contracts/openapi.yaml (docelowo profile w demo/profiles/, INT-03).
import type { Answers, Title } from "../main-flow/wizard/answers";

export type EzlaCode = "A" | "B" | "C" | "D" | "E";

export type TestUser = {
  id: string;
  firstName: string;
  lastName: string;
  /** Krótki opis sytuacji, widoczny przy wyborze konta. */
  persona: string;
  role: "MOTHER" | "FATHER";
  title: Exclude<Title, "NONE">;
  titleLabel: string;
  payerName: string;
  insuredFrom: string;
  voluntarySickness: boolean;
  contractType: Answers["contractType"];
  payerSize: Answers["payerSize"];
  /** Średnia miesięczna podstawa z 12 miesięcy (string, bez float). */
  salaryAvg: string;
  /** Zaległość składkowa na dzień zaświadczenia (string). */
  debt: string;
  partnerInsured: boolean;
  usedLeave: Partial<Answers> | null;
  ezla: { certificate_id: string; issued_at: string; from: string; to: string; codes: EzlaCode[] }[];
};

export const TEST_USERS: TestUser[] = [
  {
    id: "employee_mother",
    firstName: "Anna",
    lastName: "Przykładowa",
    persona: "Mama w ciąży, umowa o pracę",
    role: "MOTHER",
    title: "EMPLOYMENT",
    titleLabel: "umowa o pracę na czas nieokreślony",
    payerName: "Przykładowa Firma Sp. z o.o. (fikcyjna)",
    insuredFrom: "2019-03-01",
    voluntarySickness: false,
    contractType: "INDEFINITE",
    payerSize: "GT20",
    salaryAvg: "7800.00",
    debt: "0.00",
    partnerInsured: true,
    usedLeave: null,
    ezla: [
      { certificate_id: "SYM-ZLA-0001", issued_at: "2026-08-04", from: "2026-08-04", to: "2026-08-31", codes: ["B"] },
      { certificate_id: "SYM-ZLA-0002", issued_at: "2026-09-01", from: "2026-09-01", to: "2026-10-15", codes: ["B"] },
    ],
  },
  {
    id: "self_employed_debt",
    firstName: "Ewa",
    lastName: "Testowa",
    persona: "Własna działalność, zaległość w składkach",
    role: "MOTHER",
    title: "SELF_EMPLOYED",
    titleLabel: "działalność gospodarcza, dobrowolne ubezpieczenie chorobowe",
    payerName: "Ewa Testowa - działalność (fikcyjna)",
    insuredFrom: "2025-01-01",
    voluntarySickness: true,
    contractType: null,
    payerSize: "UNKNOWN",
    salaryAvg: "5200.00",
    debt: "120.00",
    partnerInsured: true,
    usedLeave: null,
    ezla: [
      { certificate_id: "SYM-ZLA-0101", issued_at: "2026-10-06", from: "2026-10-06", to: "2026-11-30", codes: ["B"] },
    ],
  },
  {
    id: "father_takeover",
    firstName: "Piotr",
    lastName: "Próbny",
    persona: "Tata, umowa o pracę w małej firmie",
    role: "FATHER",
    title: "EMPLOYMENT",
    titleLabel: "umowa o pracę na czas nieokreślony",
    payerName: "Mała Pracownia Próbna (fikcyjna)",
    insuredFrom: "2020-05-01",
    voluntarySickness: false,
    contractType: "INDEFINITE",
    payerSize: "LE20",
    salaryAvg: "9200.00",
    debt: "0.00",
    partnerInsured: true,
    usedLeave: null,
    ezla: [],
  },
  {
    id: "mandate_mother_after_birth",
    firstName: "Marta",
    lastName: "Wzorcowa",
    persona: "Mama po porodzie, umowa zlecenia, część urlopu wykorzystana",
    role: "MOTHER",
    title: "MANDATE",
    titleLabel: "umowa zlecenia, dobrowolne ubezpieczenie chorobowe",
    payerName: "Wzorcowe Usługi S.A. (fikcyjna)",
    insuredFrom: "2022-06-01",
    voluntarySickness: true,
    contractType: null,
    payerSize: "GT20",
    salaryAvg: "4900.00",
    debt: "0.00",
    partnerInsured: false,
    usedLeave: { usedMaternityFully: "YES", usedParentalMotherWeeks: "12", usedParentalFatherWeeks: "0", usedParts: "1", usedVariant: "FULL_100_70" },
    ezla: [
      { certificate_id: "SYM-ZLA-0301", issued_at: "2025-11-03", from: "2025-11-03", to: "2025-12-12", codes: ["B"] },
    ],
  },
];

export const EZLA_CODE_LABEL: Record<EzlaCode, string> = {
  A: "kolejna niezdolność do pracy bez przerwy lub po przerwie do 60 dni",
  B: "niezdolność do pracy przypada w okresie ciąży",
  C: "niezdolność spowodowana nadużyciem alkoholu",
  D: "niezdolność spowodowana gruźlicą",
  E: "niezdolność spowodowana chorobą zakaźną",
};

export function findUser(id: string | null | undefined): TestUser | null {
  return TEST_USERS.find((u) => u.id === id) ?? null;
}

export const fullName = (u: TestUser) => `${u.firstName} ${u.lastName}`;
export const initials = (u: TestUser) => `${u.firstName[0]}${u.lastName[0]}`;
