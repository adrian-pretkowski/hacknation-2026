import type { PlannerChoice } from "@/lib/api";

// Odpowiedzi kreatora (stan UI). Zamieniane na EvaluateRequest w request.ts — tylko tam powstaje model kontraktu.

export type Role = "MOTHER" | "FATHER" | "GUARDIAN";
export type Stage = "PREGNANT" | "BORN";
export type Title = "EMPLOYMENT" | "MANDATE" | "SELF_EMPLOYED" | "NONE";
export type Tri = "YES" | "NO" | "UNKNOWN";
export type Variant = "COMBINED_815" | "FULL_100_70";

export type Answers = {
  sensitive: boolean;
  role: Role | null;
  stage: Stage | null;
  guardianKind: "ADOPTION" | "FOSTER_NON_PROFESSIONAL" | "FOSTER_PROFESSIONAL" | null;
  childAgeYears: string;
  schoolDeferred: Tri;
  title: Title | null;
  voluntarySickness: Tri;
  insuredFrom: string;
  contractType: "INDEFINITE" | "FIXED_TERM" | null;
  contractEnd: string;
  contractEndsAfter3rdMonth: Tri;
  employerEnded: "NO" | "LIQUIDATION" | "BANKRUPTCY" | "OWN_NOTICE";
  payerSize: "GT20" | "LE20" | "UNKNOWN";
  debt: string;
  startedDuringPregnancy: Tri;
  raisedBaseDuringPregnancy: Tri;
  eventDate: string;
  children: number;
  preterm: boolean;
  gestationWeeks: string;
  /** Masa urodzeniowa (przy kilkorgu dzieci: najlżejszego) ≤ SUPP_WEIGHT_THRESHOLD_G — FE1-05, zamiast dokładnej masy. */
  lowBirthWeight: Tri;
  hospitalWeeks: string;
  lateHospitalQualifies: Tri;
  zaZyciem: boolean;
  stillborn: boolean;
  allStillborn: boolean;
  lossKind: "STILLBORN" | "DIED";
  deathDate: string;
  partnerInsured: Tri;
  maternityStart: string;
  usedMaternityFully: Tri;
  usedParentalMotherWeeks: string;
  usedParentalFatherWeeks: string;
  usedParts: string;
  usedVariant: Variant | "UNKNOWN";
  fatherParentalWeeks: number;
  fatherTakesOverMaternity: boolean;
  workFraction: "0" | "0.25" | "0.5";
  workWeeks: string;
  salaryGross: string;
  // Optymalizacja (planer BE2-07)
  partnerSalaryGross: string;
  plannerObjective: "MAX_MONEY" | "MAX_TIME";
  plannerChoices: PlannerChoice[];
  plannerVariant: Variant | null;
  plannerApplied: boolean;
};

export const EMPTY_ANSWERS: Answers = {
  sensitive: false,
  role: null,
  stage: null,
  guardianKind: null,
  childAgeYears: "",
  schoolDeferred: "UNKNOWN",
  title: null,
  voluntarySickness: "UNKNOWN",
  insuredFrom: "",
  contractType: null,
  contractEnd: "",
  contractEndsAfter3rdMonth: "UNKNOWN",
  employerEnded: "NO",
  payerSize: "UNKNOWN",
  debt: "",
  startedDuringPregnancy: "UNKNOWN",
  raisedBaseDuringPregnancy: "UNKNOWN",
  eventDate: "",
  children: 1,
  preterm: false,
  gestationWeeks: "",
  lowBirthWeight: "UNKNOWN",
  hospitalWeeks: "",
  lateHospitalQualifies: "UNKNOWN",
  zaZyciem: false,
  stillborn: false,
  allStillborn: true,
  lossKind: "STILLBORN",
  deathDate: "",
  partnerInsured: "YES",
  maternityStart: "",
  usedMaternityFully: "YES",
  usedParentalMotherWeeks: "0",
  usedParentalFatherWeeks: "0",
  usedParts: "0",
  usedVariant: "UNKNOWN",
  fatherParentalWeeks: 9,
  fatherTakesOverMaternity: false,
  workFraction: "0",
  workWeeks: "",
  salaryGross: "",
  partnerSalaryGross: "",
  plannerObjective: "MAX_MONEY",
  plannerChoices: [],
  plannerVariant: null,
  plannerApplied: false,
};

/** Przykłady startowe (dane syntetyczne, bez odniesień do spraw ZUS). */
export const PRESETS: { id: string; label: string; answers: Partial<Answers> }[] = [
  {
    id: "s1",
    label: "Mama na etacie, poród 1 grudnia",
    answers: { role: "MOTHER", stage: "PREGNANT", title: "EMPLOYMENT", contractType: "INDEFINITE", payerSize: "GT20",
      insuredFrom: "2021-03-01", eventDate: "2026-12-01", children: 1, salaryGross: "8000" },
  },
  {
    id: "s2",
    label: "Bliźnięta, poród 1 grudnia",
    answers: { role: "MOTHER", stage: "PREGNANT", title: "EMPLOYMENT", contractType: "INDEFINITE", payerSize: "GT20",
      insuredFrom: "2021-03-01", eventDate: "2026-12-01", children: 2, salaryGross: "8000" },
  },
  {
    id: "s3",
    label: "Dziecko z 2024 r., część urlopu wykorzystana",
    answers: { role: "MOTHER", stage: "BORN", title: "EMPLOYMENT", contractType: "INDEFINITE", payerSize: "GT20",
      insuredFrom: "2019-01-01", eventDate: "2024-03-15", children: 1, usedMaternityFully: "YES",
      usedParentalMotherWeeks: "20", usedParts: "1", usedVariant: "FULL_100_70", salaryGross: "8000" },
  },
  {
    id: "s5",
    label: "Tata: ojcowski i podział rodzicielskiego",
    answers: { role: "FATHER", stage: "PREGNANT", title: "EMPLOYMENT", contractType: "INDEFINITE", payerSize: "GT20",
      insuredFrom: "2020-05-01", eventDate: "2026-12-01", children: 1, partnerInsured: "YES", fatherParentalWeeks: 9,
      salaryGross: "8000" },
  },
  {
    id: "s9",
    label: "JDG w ciąży, zaległość w składkach",
    answers: { role: "MOTHER", stage: "PREGNANT", title: "SELF_EMPLOYED", voluntarySickness: "YES", insuredFrom: "2025-01-01",
      debt: "120.00", eventDate: "2027-02-10", children: 1, salaryGross: "5000" },
  },
];
