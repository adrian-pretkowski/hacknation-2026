// Odpowiedzi kreatora → EvaluateRequest (contracts/openapi.yaml v1, model zus_rules/04).
// Pola nieznane zostają null (silnik: UNKNOWN → NEEDS_DATA). Preferencje planu bez odpowiednika w kontrakcie
// trafiają do `wizard_plan` (kontrakt dopuszcza additionalProperties; do formalizacji przez INT).
import type { EvaluateRequest } from "@/lib/api";
import { baseFromGross } from "../preview/engine";
import { addDays } from "../preview/exact";
import { type Answers, type Tri, type Variant, extendableUntilBirth, hasContractEnd } from "./answers";
import { parseMoney } from "./money";

export type WizardPlan = {
  father_parental_weeks: number;
  father_takes_over_maternity: boolean;
  work_fraction: string;
  work_weeks: number | null;
  used_maternity_fully: boolean | null;
  used_maternity_weeks: number | null;
  used_parental_mother_weeks: number;
  used_parental_father_weeks: number;
  used_parts: number;
  used_variant: Variant | null;
  started_during_pregnancy: boolean | null;
  raised_base_during_pregnancy: boolean | null;
  voluntary_sickness: boolean | null;
  hospital_weeks: number | null;
  late_hospital_qualifies: boolean | null;
  child_age_years: number | null;
  employer_ended: Answers["employerEnded"];
  gross_salary: string | null;
  full_time: boolean | null; // FE1-20: pełny etat (minimalna podstawa, BASE-EMP-008)
  no_insurance_reason: NoInsuranceReason | null; // FE1-22: ulga na start / student do 26 lat
};

export type NoInsuranceReason = "START_RELIEF" | "STUDENT_UNDER_26";

/** FE1-22: tytuł, który nie daje ubezpieczenia chorobowego (ulga na start, uczeń / student na zleceniu). */
export function noInsuranceReason(a: Answers): NoInsuranceReason | null {
  if (a.title === "SELF_EMPLOYED" && a.startRelief === "YES") return "START_RELIEF";
  if (a.title === "MANDATE" && a.studentUnder26 === "YES") return "STUDENT_UNDER_26";
  return null;
}

export type WizardRequest = EvaluateRequest & { wizard_plan: WizardPlan };

const tri = (v: Tri): boolean | null => (v === "YES" ? true : v === "NO" ? false : null);
const num = (v: string): number | null => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));
const money = parseMoney; // FE1-15: wspólna normalizacja kwot (money.ts); kwota ≥ 0 (np. zaległość 0)

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function toEvaluateRequest(a: Answers, variant: Variant): WizardRequest {
  const today = todayIso();
  const eventDate = a.eventDate || null;
  const isGuardian = a.role === "GUARDIAN";
  const eventType = isGuardian ? (a.guardianKind === "ADOPTION" ? "ADOPTION" : "FOSTER") : "BIRTH";
  const forecast = !!eventDate && eventDate > today;

  const titleType = a.title === "EMPLOYMENT" ? "EMPLOYMENT_CONTRACT" : a.title === "MANDATE" ? "CIVIL_CONTRACT_MANDATE"
    : a.title === "SELF_EMPLOYED" ? "SELF_EMPLOYED" : null;
  const excluded = noInsuranceReason(a);
  const mode = a.title === "EMPLOYMENT" ? "MANDATORY" : excluded ? "NONE"
    : a.voluntarySickness === "YES" ? "VOLUNTARY" : a.voluntarySickness === "NO" ? "NONE" : null;

  let titleTo: string | null = null;
  let terminationReason: string | null = null;
  if (a.title === "EMPLOYMENT" && hasContractEnd(a.contractType) && a.contractEnd) {
    titleTo = a.contractEnd;
    terminationReason = "CONTRACT_EXPIRY";
  }
  if (a.employerEnded === "LIQUIDATION") terminationReason = "EMPLOYER_LIQUIDATION";
  if (a.employerEnded === "BANKRUPTCY") terminationReason = "EMPLOYER_BANKRUPTCY";
  if (a.employerEnded === "OWN_NOTICE") terminationReason = "NOTICE_BY_EMPLOYEE";
  if (a.employerEnded !== "NO" && !titleTo && eventDate) titleTo = addDays(today, -1);

  // FE1-22: przy uldze na start / studencie do 26 lat tytuł bez chorobowego — data ubezpieczenia niepotrzebna
  const titles = titleType && mode && (a.insuredFrom || excluded)
    ? [{ title_type: titleType, sickness_insurance_mode: mode, from: a.insuredFrom || null, to: titleTo, termination_reason: terminationReason }]
    : a.title === "NONE" ? [] : undefined;

  const gross = money(a.salaryGross);
  const childCount = a.children;
  const items = a.stillborn && eventDate
    ? Array.from({ length: childCount }, (_, i) => ({
        birth_date: eventDate,
        stillborn: a.lossKind === "STILLBORN" && (a.allStillborn || i === 0),
        death_date: a.lossKind === "DIED" && (a.allStillborn || i === 0) ? a.deathDate || null : null,
      }))
    // FE1-26: przy przyjęciu dziecka — data urodzenia (koniec urlopu przed granicą wieku)
    : isGuardian && a.childBirthDate ? [{ birth_date: a.childBirthDate }]
    : undefined;

  return {
    evaluation: { as_of_date: today, mode: forecast ? "FORECAST" : "DECISION_SUPPORT" },
    person: { role: a.role === "FATHER" ? "FATHER" : isGuardian ? (eventType === "ADOPTION" ? "ADOPTIVE_PARENT" : "FOSTER_PARENT") : "MOTHER" },
    mother: a.role === "FATHER" ? { sickness_insured: tri(a.partnerInsured) } : undefined,
    insurance: titles ? { titles: titles as never, titles_confirmed_complete: a.title === "NONE" } : undefined,
    employment: a.title === "EMPLOYMENT"
      ? {
          contract_type: a.contractType,
          contract_end_date: hasContractEnd(a.contractType) ? a.contractEnd || null : null,
          is_replacement_contract: a.contractType === null ? null : a.contractType === "REPLACEMENT",
          // FE1-24: umowa na zastępstwo i próbna ≤ 1 mies. nie przedłużają się do dnia porodu (MAT-CLS-002)
          extended_until_birth_kp177: extendableUntilBirth(a.contractType) ? tri(a.contractEndsAfter3rdMonth)
            : hasContractEnd(a.contractType) ? false : null,
          working_time_fraction: a.fullTime === "YES" ? "1.0" : null,
        }
      : undefined,
    payer: { insured_count_on_nov30_prev_year: a.payerSize === "GT20" ? 21 : a.payerSize === "LE20" ? 1 : null },
    pregnancy: !isGuardian && forecast ? { expected_due_date: eventDate } : undefined,
    event: {
      type: eventType,
      date: eventDate,
      foster_family_type: eventType === "FOSTER"
        ? (a.guardianKind === "FOSTER_PROFESSIONAL" ? "PROFESSIONAL" : "NON_PROFESSIONAL") : null,
      adoption_final_date: eventType === "ADOPTION" ? a.adoptionFinalDate || null : null, // FE1-26
    },
    // FE1-05: masa jako odpowiedź względem progu (birth.weight_at_most_threshold), bez dokładnej wagi
    birth: a.preterm
      ? { completed_gestation_weeks: num(a.gestationWeeks), weight_at_most_threshold: tri(a.lowBirthWeight ?? "UNKNOWN") }
      : undefined,
    children: {
      count_at_birth: isGuardian ? null : childCount,
      count_at_event: isGuardian ? childCount : null,
      za_zyciem_certificate: a.zaZyciem ? true : null,
      school_obligation_deferred: isGuardian ? tri(a.schoolDeferred) : null,
      items,
    },
    // FE1-20: do API podstawa bez granic — minimum i limit nakłada silnik (BE2-12: BASE-EMP-008, BASE-NEMP-005);
    // podgląd (mock) liczy granice z `wizard_plan.gross_salary` w baseFromGrossDetailed
    income_history: { manual_base_override: gross ? baseFromGross(gross) : null },
    applications: { combined_815_planned: variant === "COMBINED_815" },
    plan: { maternity_start_date: a.maternityStart || null },
    debt: a.title === "SELF_EMPLOYED" ? { amount_on_right_date: money(a.debt) } : undefined,
    wizard_plan: {
      father_parental_weeks: a.fatherParentalWeeks,
      father_takes_over_maternity: a.fatherTakesOverMaternity,
      work_fraction: a.workFraction,
      work_weeks: num(a.workWeeks),
      used_maternity_fully: a.stage === "BORN" ? tri(a.usedMaternityFully) : null,
      used_maternity_weeks: a.stage === "BORN" && a.usedMaternityFully === "NO" ? num(a.usedMaternityWeeks) : null,
      used_parental_mother_weeks: num(a.usedParentalMotherWeeks) ?? 0,
      used_parental_father_weeks: num(a.usedParentalFatherWeeks) ?? 0,
      used_parts: num(a.usedParts) ?? 0,
      used_variant: a.usedVariant === "UNKNOWN" ? null : a.usedVariant,
      started_during_pregnancy: tri(a.startedDuringPregnancy),
      raised_base_during_pregnancy: tri(a.raisedBaseDuringPregnancy),
      voluntary_sickness: tri(a.voluntarySickness),
      hospital_weeks: num(a.hospitalWeeks),
      late_hospital_qualifies: tri(a.lateHospitalQualifies),
      child_age_years: num(a.childAgeYears),
      employer_ended: a.employerEnded,
      gross_salary: gross,
      full_time: a.title === "EMPLOYMENT" ? tri(a.fullTime) : null,
      no_insurance_reason: excluded,
    },
  };
}
