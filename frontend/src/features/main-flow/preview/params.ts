// MOCK silnika: kopia parametrów z zus_rules/03_rules.yaml (meta.parameters) na potrzeby podglądu planu w przeglądarce.
// Docelowo: wartości z GET /api/admin/parameters, a całe wyliczenie z POST /api/evaluate (BE2-01..04).
// Nie dopisuj tu wartości spoza 03 (najpierw parametr w 03_rules.yaml).

export const PARAMS = {
  WEEK_AS_DAYS: 7,
  MONTH_AS_DAYS: 30,
  MATERNITY_WEEKS_BY_CHILDREN: { "1": 20, "2": 31, "3": 33, "4": 35, "5+": 37 } as Record<string, number>,
  PRE_BIRTH_MAX_WEEKS: 6,
  MOTHER_MIN_WEEKS_BEFORE_TRANSFER: 14,
  STILLBIRTH_LEAVE_WEEKS: 8,
  CHILD_DEATH_MIN_DAYS: 7,
  ADOPTION_CHILD_AGE_MAX: 14,
  FOSTER_CHILD_AGE_MAX: 7,
  FOSTER_CHILD_AGE_MAX_SCHOOL_DEFERRED: 10,
  SUPP_CAP_WEEK_EARLY: 15,
  SUPP_CAP_WEEK_PRETERM: 8,
  SUPP_WEIGHT_THRESHOLD_G: 1000,
  SUPP_GESTATION_EARLY_WEEK: 28,
  SUPP_GESTATION_TERM_WEEK: 37,
  PARENTAL_WEEKS_SINGLE: 41,
  PARENTAL_WEEKS_MULTIPLE: 43,
  PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE: 65,
  PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE: 67,
  PARENTAL_WEEKS_ADOPT_GUARANTEED: 38, // KP art. 183 § 4 pkt 3 (PAR-DUR-003, przypadek § 3)
  PARENTAL_WEEKS_ADOPT_GUARANTEED_ZA_ZYCIEM: 62, // KP art. 183 § 4(3) pkt 3
  PARENTAL_NONTRANSFERABLE_WEEKS: 9,
  PARENTAL_MAX_PARTS: 5,
  PARENTAL_CHILD_AGE_YEAR_LIMIT: 6,
  PARENTAL_WORK_MAX_FRACTION: "0.5",
  PARENTAL_EXT_CAP: { single: 82, multiple: 86, za_zyciem_single: 130, za_zyciem_multiple: 134 },
  PATERNITY_WEEKS: 2,
  PATERNITY_MAX_PARTS: 2,
  PATERNITY_CHILD_AGE_MONTHS: 12,
  PATERNITY_ADOPTION_WINDOW_MONTHS: 12, // KP art. 182(3) § 1 pkt 2 (FE1-26)
  MAT_RATE_FULL: "1.00",
  MAT_RATE_PARENTAL: "0.70",
  MAT_RATE_COMBINED: "0.815",
  APP_COMBINED_DEADLINE_DAYS: 21,
  CONTRIBUTION_DEDUCTION_RATE: "0.1371",
  MIN_WAGE_2026_MONTHLY: "4806.00",
  VOLUNTARY_MAX_CONTRIB_BASE_2026: "23550.00",
  PAYER_INSURED_THRESHOLD: 20,
  DEBT_THRESHOLD_MIN_WAGE_RATIO: "0.01",
  WAITING_DAYS_VOLUNTARY: 90,
  // FE1-43: zasiłek chorobowy w ciąży (wymaganie a) - nazwy i wartości jak w 03 (meta.parameters)
  WAITING_DAYS_MANDATORY: 30, // USTAWA art. 4 ust. 1 pkt 1
  SICK_RATE_FULL: "1.00", // USTAWA art. 11 ust. 2 (ciąża - kod B)
  BENEFIT_PERIOD_PREGNANCY_TB_DAYS: 270, // USTAWA art. 8 ust. 1
  SICK_PAY_DAYS_STD: 33, // KP art. 92 § 1 pkt 1
  SICK_PAY_DAYS_50PLUS: 14, // KP art. 92 § 1 pkt 1, § 5
  SICK_PAY_AGE_THRESHOLD: 50, // KP art. 92 § 1, § 5
  PARENTAL_BENEFIT_FLOOR_MONTHLY: "1000.00", // RATE-MAT-007, M10 (FE1-21)
  // FE1-25: terminy wniosków urlopowych (APP-DL-002) - nazwy i wartości jak w 03 (meta.parameters)
  LEAVE_APP_PARENTAL_DAYS_BEFORE: 21, // KP art. 182(1d) § 1; art. 182(1e) § 2 (łączenie z pracą)
  LEAVE_APP_MATERNITY_PRE_BIRTH_DAYS_BEFORE: 14, // Poradnik ZUS 2026 - UNCONFIRMED (GAP-025, M19)
  LEAVE_APP_MATERNITY_FOR_FATHER_DAYS_BEFORE: 14, // KP art. 180 § 9
  LEAVE_APP_PATERNITY_DAYS_BEFORE: 7, // KP art. 182(3) § 2
  LEAVE_APP_SUPPLEMENTARY_DAYS_BEFORE_MATERNITY_END: 21, // KP art. 180(2) § 4
  LEAVE_APP_RESIGNATION_DAYS_BEFORE_RETURN: 7, // KP art. 180 § 8
  LEAVE_APP_MATERNITY_LIKE_DAYS_AFTER_ACCEPTANCE: 7, // KP art. 183 § 6
  // FE1-22, BA-06: wyłączenia z ubezpieczeń społecznych - w 03 jako UNCONFIRMED (źródła spoza materiałów, M20)
  STUDENT_AGE_LIMIT_YEARS: 26, // ustawa o systemie ubezpieczeń społecznych art. 6 ust. 4
  START_RELIEF_MONTHS: 6, // Prawo przedsiębiorców art. 18
} as const;

// FE1-25, BA-06: wszystkie wartości podglądu są już w 03 - PREVIEW_ONLY usunięte.
