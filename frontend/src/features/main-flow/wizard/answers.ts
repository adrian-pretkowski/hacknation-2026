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
  /** BE1-09, FE1-41: data wniosku do sądu o przysposobienie (MAT-ELIG-002) - bez niej silnik pyta, nie odmawia. */
  courtApplicationDate: string;
  /** FE1-41: mama w ciąży na zwolnieniu lekarskim (L4) - zasiłek chorobowy w ciąży (event PREGNANCY_INCAPACITY). */
  sickLeave: Tri;
  sickLeaveFrom: string;
  sickLeaveTo: string;
  /** FE1-41: wcześniejsze zwolnienia w tym roku (NO → historia pusta, 0 dni wynagrodzenia chorobowego). */
  sickLeaveEarlier: Tri;
  /** FE1-43: data urodzenia mamy (opcjonalnie) - podział dni zwolnienia: wynagrodzenie chorobowe 33 / 14 dni (KP art. 92). */
  birthDate: string;
  /** FE1-44: po porodzie - ile tygodni rodzicielskiego weźmie jeszcze tata (limit: pozostałe tygodnie taty). */
  fatherRemainingWeeks: string;
  /** FE1-44: po porodzie - czy tata wykorzystał już urlop ojcowski. */
  fatherPaternityUsed: Tri;
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
  courtApplicationDate: "",
  sickLeave: "UNKNOWN",
  sickLeaveFrom: "",
  sickLeaveTo: "",
  sickLeaveEarlier: "UNKNOWN",
  birthDate: "",
  fatherRemainingWeeks: "",
  fatherPaternityUsed: "UNKNOWN",
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
    // FE1-50: L4 w ciąży (kod B) od 40 dni, płatnik > 20 osób - karta zasiłku chorobowego z kwotami (100%):
    // wynagrodzenie chorobowe (limit dni w każdym roku kalendarzowym - przy przełomie roku dni jest więcej), dalej zasiłek
    // wypłacany przez pracodawcę; bez wcześniejszych zwolnień w roku. Data urodzenia mamy: SICKPAY-ELIG-001 (33 / 14 dni).
    id: "s10",
    label: "Mama na L4 w ciąży, poród za 50 dni",
    answers: { role: "MOTHER", stage: "PREGNANT", title: "EMPLOYMENT", contractType: "INDEFINITE", fullTime: "YES", payerSize: "GT20",
      insuredFrom: "2021-03-01", eventDate: inDays(50), children: 1, salaryGross: "8000",
      sickLeave: "YES", sickLeaveFrom: inDays(-40), sickLeaveTo: inDays(49), sickLeaveEarlier: "NO", birthDate: "1994-05-20" },
  },
  {
    id: "s9",
    label: "JDG w ciąży, zaległość w składkach",
    answers: { role: "MOTHER", stage: "PREGNANT", title: "SELF_EMPLOYED", voluntarySickness: "YES", insuredFrom: "2025-01-01",
      debt: "120.00", eventDate: inDays(81), children: 1, salaryGross: "5000" },
  },
  {
    // FE1-52: ulga na start - bez ubezpieczeń społecznych, więc i bez zasiłku (wynik z powodem, nie sama odmowa).
    // Data rozpoczęcia działalności: 60 dni temu, poród w trakcie 6 mies. ulgi (kontrakt wymaga `insurance.titles[].from`).
    id: "s11",
    label: "JDG na uldze na start, poród za 80 dni",
    answers: { role: "MOTHER", stage: "PREGNANT", title: "SELF_EMPLOYED", startRelief: "YES", insuredFrom: inDays(-60), eventDate: inDays(80), children: 1,
      salaryGross: "5000" },
  },
  {
    // FE1-52: likwidacja pracodawcy w ciąży - zasiłek po ustaniu zatrudnienia wypłaca ZUS (art. 30 ustawy zasiłkowej).
    id: "s12",
    label: "Pracodawca w likwidacji, poród za 40 dni",
    answers: { role: "MOTHER", stage: "PREGNANT", title: "EMPLOYMENT", contractType: "INDEFINITE", fullTime: "YES", payerSize: "GT20",
      insuredFrom: "2020-09-01", employerEnded: "LIQUIDATION", eventDate: inDays(40), children: 1, salaryGross: "7000" },
  },
  {
    // FE1-52: praca w niepełnym wymiarze w trakcie rodzicielskiego - zasiłek proporcjonalnie, okres się wydłuża.
    id: "s13",
    label: "Mama wraca na pół etatu w rodzicielskim",
    answers: { role: "MOTHER", stage: "PREGNANT", title: "EMPLOYMENT", contractType: "INDEFINITE", fullTime: "YES", payerSize: "GT20",
      insuredFrom: "2021-03-01", eventDate: inDays(10), children: 1, workFraction: "0.5", workWeeks: "16", salaryGross: "8000" },
  },
  {
    // FE1-52: adopcja 3-latka - macierzyński 20 tyg. od przyjęcia dziecka, ojcowski 12 mies. od uprawomocnienia.
    id: "s14",
    label: "Adopcja 3-latka, przyjęcie za 14 dni",
    answers: { role: "GUARDIAN", guardianKind: "ADOPTION", title: "EMPLOYMENT", contractType: "INDEFINITE", fullTime: "YES",
      payerSize: "GT20", insuredFrom: "2020-01-01", eventDate: inDays(14), childAgeYears: "3", childBirthDate: inDays(-3 * 365 - 30),
      courtApplicationDate: inDays(-120), children: 1, salaryGross: "8000" },
  },
  {
    // FE1-52: firma założona w ciąży z wysoką podstawą - ryzyko kontroli ZUS i weryfikacji podstawy.
    id: "s15",
    label: "Firma założona w ciąży, wysoka podstawa składek",
    answers: { role: "MOTHER", stage: "PREGNANT", title: "SELF_EMPLOYED", voluntarySickness: "YES", insuredFrom: inDays(-150),
      startedDuringPregnancy: "YES", raisedBaseDuringPregnancy: "YES", debt: "0", eventDate: inDays(60), children: 1,
      salaryGross: "12000" },
  },
];

/** FE1-52: najczęstsze pytania rodziców (poradniki i fora o zasiłkach) jako gotowe przykłady - osobna grupa na ekranie startowym. */
export const POPULAR_PRESETS: { id: string; label: string; question: string; answers: Partial<Answers> }[] = [
  {
    // zasiłek uzupełniający (od 19.03.2025): 30. tydzień, > 1000 g, 35 dni w szpitalu = 5 tyg.
    id: "p1",
    label: "Wcześniak, 5 tygodni w szpitalu",
    question: "Czy pobyt dziecka w szpitalu wydłuża macierzyński?",
    answers: { role: "MOTHER", stage: "BORN", title: "EMPLOYMENT", contractType: "INDEFINITE", fullTime: "YES", payerSize: "GT20",
      insuredFrom: "2021-03-01", eventDate: inDays(-40), children: 1, preterm: true, gestationWeeks: "30", lowBirthWeight: "NO",
      hospitalDays: "35", hospitalWeeks: "5", salaryGross: "8000" },
  },
  {
    // zlecenie: zasiłek tylko z dobrowolnym chorobowym w dniu porodu, bez okresu wyczekiwania
    id: "p2",
    label: "Umowa zlecenie z dobrowolnym chorobowym",
    question: "Czy na zleceniu dostanę zasiłek macierzyński?",
    answers: { role: "MOTHER", stage: "PREGNANT", title: "MANDATE", voluntarySickness: "YES", studentUnder26: "NO", payerSize: "GT20",
      insuredFrom: "2024-06-01", eventDate: inDays(30), children: 1, salaryGross: "6000" },
  },
  {
    // umowa terminowa kończąca się po 3. miesiącu ciąży przedłuża się do dnia porodu (KP art. 177 § 3, MAT-CLS-002)
    id: "p3",
    label: "Umowa na czas określony kończy się w ciąży",
    question: "Co, gdy umowa wygasa przed porodem?",
    answers: { role: "MOTHER", stage: "PREGNANT", title: "EMPLOYMENT", contractType: "FIXED_TERM", contractEnd: inDays(20),
      contractEndsAfter3rdMonth: "YES", fullTime: "YES", payerSize: "GT20", insuredFrom: "2023-02-01", eventDate: inDays(60),
      children: 1, salaryGross: "7000" },
  },
  {
    // 9 tygodni rodzicielskiego tylko dla taty - nie przechodzą na mamę, przepadają (KP art. 182¹a)
    id: "p4",
    label: "Tata nie bierze swoich 9 tygodni",
    question: "Czy mama może wziąć tygodnie taty?",
    answers: { role: "MOTHER", stage: "PREGNANT", title: "EMPLOYMENT", contractType: "INDEFINITE", fullTime: "YES", payerSize: "GT20",
      insuredFrom: "2021-03-01", eventDate: inDays(10), children: 1, partnerInsured: "YES", fatherParentalWeeks: 0,
      salaryGross: "8000" },
  },
];
