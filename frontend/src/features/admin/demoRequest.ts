// FE1-03: przykładowa sprawa do podglądu skutku zmiany parametrów - DANE SYNTETYCZNE, ta sama co
// demo/scenario_employee_mother.json (pracownica, 1 dziecko, poród 2027-03-15, podstawa 6000 zł, wniosek 81,5%).
import type { EvaluateRequest } from "@/lib/api";

export const DEMO_REQUEST: EvaluateRequest = {
  evaluation: { as_of_date: "2027-04-05" },
  person: { role: "MOTHER" },
  insurance: { titles: [{ title_type: "EMPLOYMENT_CONTRACT", sickness_insurance_mode: "MANDATORY", from: "2022-02-01", to: null }] },
  event: { type: "BIRTH", date: "2027-03-15" },
  children: { count_at_birth: 1, items: [{ birth_date: "2027-03-15" }], za_zyciem_certificate: false },
  income_history: { manual_base_override: "6000.00" },
  applications: { combined_815_filed_date: "2027-04-05" },
  debt: { amount_on_right_date: null },
};
