// Odpowiedzi kreatora → EvaluateRequest (contracts/openapi.yaml v1, model zus_rules/04).
// Pola nieznane zostają null (silnik: UNKNOWN → NEEDS_DATA). Preferencje planu bez odpowiednika w kontrakcie
// trafiają do `wizard_plan` (kontrakt dopuszcza additionalProperties; do formalizacji przez INT).
import type { EvaluateRequest } from "@/lib/api";
import { baseFromGross } from "../preview/engine";
import { addDays } from "../preview/exact";
import type { Answers, Tri, Variant } from "./answers";

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
};

export type WizardRequest = EvaluateRequest & { wizard_plan: WizardPlan };

const tri = (v: Tri): boolean | null => (v === "YES" ? true : v === "NO" ? false : null);
const num = (v: string): number | null => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));
const money = (v: string): string | null => {
  const t = v.trim().replace(/\s/g, "").replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(t) ? t : null;
};

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
  const mode = a.title === "EMPLOYMENT" ? "MANDATORY"
    : a.voluntarySickness === "YES" ? "VOLUNTARY" : a.voluntarySickness === "NO" ? "NONE" : null;

  let titleTo: string | null = null;
  let terminationReason: string | null = null;
  if (a.title === "EMPLOYMENT" && a.contractType === "FIXED_TERM" && a.contractEnd) {
    titleTo = a.contractEnd;
    terminationReason = "CONTRACT_EXPIRY";
  }
  if (a.employerEnded === "LIQUIDATION") terminationReason = "EMPLOYER_LIQUIDATION";
  if (a.employerEnded === "BANKRUPTCY") terminationReason = "EMPLOYER_BANKRUPTCY";
  if (a.employerEnded === "OWN_NOTICE") terminationReason = "NOTICE_BY_EMPLOYEE";
  if (a.employerEnded !== "NO" && !titleTo && eventDate) titleTo = addDays(today, -1);

  const titles = titleType && mode && a.insuredFrom
    ? [{ title_type: titleType, sickness_insurance_mode: mode, from: a.insuredFrom, to: titleTo, termination_reason: terminationReason }]
    : a.title === "NONE" ? [] : undefined;

  const gross = money(a.salaryGross);
  const childCount = a.children;
  const items = a.stillborn && eventDate
    ? Array.from({ length: childCount }, (_, i) => ({
        birth_date: eventDate,
        stillborn: a.lossKind === "STILLBORN" && (a.allStillborn || i === 0),
        death_date: a.lossKind === "DIED" && (a.allStillborn || i === 0) ? a.deathDate || null : null,
      }))
    : undefined;

  return {
    evaluation: { as_of_date: today, mode: forecast ? "FORECAST" : "DECISION_SUPPORT" },
    person: { role: a.role === "FATHER" ? "FATHER" : isGuardian ? (eventType === "ADOPTION" ? "ADOPTIVE_PARENT" : "FOSTER_PARENT") : "MOTHER" },
    mother: a.role === "FATHER" ? { sickness_insured: tri(a.partnerInsured) } : undefined,
    insurance: titles ? { titles: titles as never, titles_confirmed_complete: a.title === "NONE" } : undefined,
    employment: a.title === "EMPLOYMENT"
      ? {
          contract_type: a.contractType,
          contract_end_date: a.contractType === "FIXED_TERM" ? a.contractEnd || null : null,
          extended_until_birth_kp177: a.contractType === "FIXED_TERM" ? tri(a.contractEndsAfter3rdMonth) : null,
        }
      : undefined,
    payer: { insured_count_on_nov30_prev_year: a.payerSize === "GT20" ? 21 : a.payerSize === "LE20" ? 1 : null },
    pregnancy: !isGuardian && forecast ? { expected_due_date: eventDate } : undefined,
    event: {
      type: eventType,
      date: eventDate,
      foster_family_type: eventType === "FOSTER"
        ? (a.guardianKind === "FOSTER_PROFESSIONAL" ? "PROFESSIONAL" : "NON_PROFESSIONAL") : null,
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
    },
  };
}
