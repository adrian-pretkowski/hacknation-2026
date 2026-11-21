import type { PlannerChoice } from "@/lib/api";
import { addDays } from "../preview/exact";

/** FE1-10: przykłady z porodem w przyszłości liczone od dziś - walidacja dat nie zablokuje ich po terminie. */
const inDays = (n: number) => {
  const d = new Date(); // data lokalna, jak todayIso() w request.ts
  return addDays(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, n);
};

// Odpowiedzi kreatora (stan UI). Zamieniane na EvaluateRequest w request.ts - tylko tam powstaje model kontraktu.

export type Role = "MOTHER" | "FATHER" | "GUARDIAN";
export type Stage = "PREGNANT" | "BORN";
export type Title = "EMPLOYMENT" | "MANDATE" | "SELF_EMPLOYED" | "NONE";
export type Tri = "YES" | "NO" | "UNKNOWN";
export type Variant = "COMBINED_815" | "FULL_100_70";
export type ContractType = "INDEFINITE" | "FIXED_TERM" | "PROBATION_OVER_1_MONTH" | "PROBATION_UP_TO_1_MONTH" | "REPLACEMENT";

/** FE1-24: umowa z datą końca (wszystko poza umową na czas nieokreślony). */
export const hasContractEnd = (t: ContractType | null) => t !== null && t !== "INDEFINITE";
/** FE1-24, MAT-CLS-002 (KP art. 177 § 3): do dnia porodu przedłuża się tylko umowa na czas określony i próbna > 1 mies. */
export const extendableUntilBirth = (t: ContractType | null) => t === "FIXED_TERM" || t === "PROBATION_OVER_1_MONTH";

export type Answers = {
  sensitive: boolean;
  role: Role | null;
  stage: Stage | null;
  guardianKind: "ADOPTION" | "FOSTER_NON_PROFESSIONAL" | "FOSTER_PROFESSIONAL" | null;
  childAgeYears: string;
  /** FE1-26: data urodzenia przyjmowanego dziecka - koniec urlopu przed 14. / 7. / 10. urodzinami (MAT-DUR-007). */
  childBirthDate: string;
  /** FE1-26: data uprawomocnienia postanowienia o przysposobieniu - od niej 12 mies. na ojcowski (PAT-DUR-001). */
  adoptionFinalDate: string;
  schoolDeferred: Tri;
  title: Title | null;
  voluntarySickness: Tri;
  /** FE1-22: JDG na uldze na start - bez ubezpieczeń społecznych, także chorobowego. */
  startRelief: Tri;
  /** FE1-22: zleceniobiorca - uczeń / student przed 26. urodzinami: bez ubezpieczeń społecznych. */
  studentUnder26: Tri;
  insuredFrom: string;
  /** FE1-24: rodzaj umowy jak `employment.contract_type` w kontrakcie (MAT-CLS-002: przedłużenie tylko terminowej i próbnej > 1 mies.). */
  contractType: ContractType | null;
  /** FE1-20: pełny etat - minimalna podstawa (BASE-EMP-008) tylko przy pełnym wymiarze czasu pracy. */
  fullTime: Tri;
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
  /** Masa urodzeniowa (przy kilkorgu dzieci: najlżejszego) ≤ SUPP_WEIGHT_THRESHOLD_G - FE1-05, zamiast dokładnej masy. */
  lowBirthWeight: Tri;
  hospitalWeeks: string;
  /** FE1-08: liczba dni pobytu z zaświadczenia ze szpitala; hospitalWeeks = ceil(dni / WEEK_AS_DAYS) - wartość wysyłana do API. */
  hospitalDays: string;
  lateHospitalQualifies: Tri;
  zaZyciem: boolean;
  stillborn: boolean;
  allStillborn: boolean;
  lossKind: "STILLBORN" | "DIED";
  deathDate: string;
  partnerInsured: Tri;
  maternityStart: string;
  usedMaternityFully: Tri;
  usedMaternityWeeks: string; // FE1-09: przy „Nie” - ile tygodni macierzyńskiego wykorzystano
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
  childBirthDate: "",
  adoptionFinalDate: "",
  schoolDeferred: "UNKNOWN",
  title: null,
  voluntarySickness: "UNKNOWN",
  startRelief: "UNKNOWN",
  studentUnder26: "UNKNOWN",
  insuredFrom: "",
  contractType: null,
  fullTime: "UNKNOWN",
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
  hospitalDays: "",
  lateHospitalQualifies: "UNKNOWN",
  zaZyciem: false,
  stillborn: false,
  allStillborn: true,
  lossKind: "STILLBORN",
  deathDate: "",
  partnerInsured: "YES",
  maternityStart: "",
  usedMaternityFully: "YES",
  usedMaternityWeeks: "",
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
    label: "Mama na etacie, poród za 10 dni",
    answers: { role: "MOTHER", stage: "PREGNANT", title: "EMPLOYMENT", contractType: "INDEFINITE", fullTime: "YES", payerSize: "GT20",
      insuredFrom: "2021-03-01", eventDate: inDays(10), children: 1, salaryGross: "8000" },
  },
  {
    id: "s2",
    label: "Bliźnięta, poród za 10 dni",
    answers: { role: "MOTHER", stage: "PREGNANT", title: "EMPLOYMENT", contractType: "INDEFINITE", fullTime: "YES", payerSize: "GT20",
      insuredFrom: "2021-03-01", eventDate: inDays(10), children: 2, salaryGross: "8000" },
  },
  {
    id: "s3",
    label: "Dziecko z 2024 r., część urlopu wykorzystana",
    answers: { role: "MOTHER", stage: "BORN", title: "EMPLOYMENT", contractType: "INDEFINITE", fullTime: "YES", payerSize: "GT20",
      insuredFrom: "2019-01-01", eventDate: "2024-03-15", children: 1, usedMaternityFully: "YES",
      usedParentalMotherWeeks: "20", usedParts: "1", usedVariant: "FULL_100_70", salaryGross: "8000" },
  },
  {
    id: "s5",
    label: "Tata: ojcowski i podział rodzicielskiego",
    answers: { role: "FATHER", stage: "PREGNANT", title: "EMPLOYMENT", contractType: "INDEFINITE", fullTime: "YES", payerSize: "GT20",
      insuredFrom: "2020-05-01", eventDate: inDays(10), children: 1, partnerInsured: "YES", fatherParentalWeeks: 9,
      salaryGross: "8000" },
  },
  {
    id: "s9",
    label: "JDG w ciąży, zaległość w składkach",
    answers: { role: "MOTHER", stage: "PREGNANT", title: "SELF_EMPLOYED", voluntarySickness: "YES", insuredFrom: "2025-01-01",
      debt: "120.00", eventDate: inDays(81), children: 1, salaryGross: "5000" },
  },
];
