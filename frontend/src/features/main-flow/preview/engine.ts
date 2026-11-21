// MOCK SILNIKA (podgląd planu) — tymczasowo w przeglądarce, dopóki silnik reguł (BE2-01..04) nie zwraca
// segmentów, terminów, ryzyk i dokumentów. Wejście: EvaluateRequest, wyjście: EvaluateResponse (kontrakt v1),
// więc UI przełączy się na backend bez zmian. Wynik oznaczony engine="fe-preview-mock".
// Parametry: ./params.ts (kopia 03_rules.yaml). Kwoty: ułamki dokładne (BigInt), bez zaokrągleń pośrednich.
import type { EvaluateResponse } from "@/lib/api";
import type { WizardRequest } from "../wizard/request";
import {
  type Ratio, addDays, addMonths, cmp, div, endOfYear, maxDate, minDate, mul, periodDays, ratio, sub, sum,
  toDecimalString, yearOf,
} from "./exact";
import { PARAMS as P, PREVIEW_ONLY as PO } from "./params";

type Status = EvaluateResponse["overall_status"];
type Benefit = EvaluateResponse["benefits"][number];
type Warning = NonNullable<EvaluateResponse["warnings"]>[number];
type Deadline = NonNullable<EvaluateResponse["deadlines"]>[number];
type Doc = NonNullable<EvaluateResponse["missing_documents"]>[number];
type PlanError = NonNullable<EvaluateResponse["plan_errors"]>[number];
type Reason = Benefit["reasons"][number];
type Parent = "MOTHER" | "FATHER";
type LeaveType =
  | "MATERNITY_LEAVE" | "MATERNITY_LEAVE_TRANSFERRED" | "MATERNITY_LIKE_LEAVE" | "SUPPLEMENTARY_MATERNITY_LEAVE"
  | "PARENTAL_LEAVE" | "PATERNITY_LEAVE";

export type Seg = {
  parent: Parent;
  leave_type: LeaveType;
  from: string;
  to: string;
  days: number;
  rate: string;
  work_fraction: string;
  rule_ids: string[];
  history?: boolean;
  reserved_9w?: boolean;
  own: boolean; // segment osoby, dla której znamy podstawę (kwota policzalna)
  needs_review?: boolean;
  amount?: string | null;
};

export type CalcStep = { label: string; value: string; basis: string };

export type PreviewSummary = {
  applicant: Parent;
  payer: "CONTRIBUTION_PAYER" | "ZUS" | null;
  base: string | null;
  parentalPoolWeeks: number | null;
  nonTransferableWeeks: number;
  maxParts: number;
  partsUsed: number | null;
  remaining: null | {
    totalWeeks: number;
    motherWeeks: number;
    fatherWeeks: number;
    partsLeft: number;
    finalDate: string;
    latestContinuousStart: string;
    latestApplication: string;
  };
  ownTotal: string | null;
  segments: Seg[];
  calcSteps: CalcStep[];
  sensitive: boolean;
  combinedEligible: boolean;
};

export type PreviewResult = { response: EvaluateResponse; summary: PreviewSummary };

const STATUS_RANK: Status[] = ["NOT_ELIGIBLE", "NEEDS_REVIEW", "NEEDS_DATA", "OUT_OF_SCOPE", "ELIGIBLE"];
const worst = (list: Status[]): Status => STATUS_RANK.find((s) => list.includes(s)) ?? "ELIGIBLE";
const W = P.WEEK_AS_DAYS;

const LEAVE_LABEL_RULE: Record<LeaveType, string> = {
  MATERNITY_LEAVE: "MAT-DUR-001",
  MATERNITY_LEAVE_TRANSFERRED: "MAT-DUR-001",
  MATERNITY_LIKE_LEAVE: "MAT-DUR-001",
  SUPPLEMENTARY_MATERNITY_LEAVE: "SUPP-CALC-001",
  PARENTAL_LEAVE: "PAR-DUR-001",
  PATERNITY_LEAVE: "PAT-DUR-001",
};

/** Podstawa wymiaru z wynagrodzenia brutto (stałego przez 12 mies.): brutto × (1 − 13,71%). Uproszczenie BASE-EMP-001. */
export function baseFromGross(gross: string): string {
  return toDecimalString(mul(ratio(gross), sub(ratio(1), ratio(P.CONTRIBUTION_DEDUCTION_RATE))));
}

/** "0.815" → "81,5%" (tylko do etykiet; bez przeliczania kwot). */
function plPercent(rate: string): string {
  return `${toDecimalString(mul(ratio(rate), ratio(100))).replace(".", ",")}%`;
}

function maternityWeeks(children: number): number {
  return P.MATERNITY_WEEKS_BY_CHILDREN[children >= 5 ? "5+" : String(children)];
}

function segAmount(seg: Seg, base: Ratio): Ratio {
  const daily = div(mul(mul(base, ratio(seg.rate)), sub(ratio(1), ratio(seg.work_fraction))), ratio(P.MONTH_AS_DAYS));
  return mul(daily, ratio(seg.days));
}

function mkSeg(parent: Parent, leave: LeaveType, from: string, days: number, rate: string, own: boolean,
  extra: Partial<Seg> = {}): Seg {
  return {
    parent, leave_type: leave, from, to: addDays(from, days - 1), days, rate, work_fraction: "0",
    rule_ids: [LEAVE_LABEL_RULE[leave]], own, ...extra,
  };
}

export function previewEvaluate(req: WizardRequest): PreviewResult {
  const wp = req.wizard_plan;
  const today = req.evaluation?.as_of_date ?? new Date().toISOString().slice(0, 10);
  const applicant: Parent = req.person?.role === "FATHER" ? "FATHER" : "MOTHER";
  const eventType = req.event.type;
  const ev = req.event.date ?? null;
  const statuses: Status[] = [];
  const missing: EvaluateResponse["missing_data"] = [];
  const warnings: Warning[] = [];
  const deadlines: Deadline[] = [];
  const docs: Doc[] = [];
  const planErrors: PlanError[] = [];
  const reasons: Reason[] = [];
  const calcSteps: CalcStep[] = [];
  const assumptions: EvaluateResponse["assumptions"] = [
    { code: "FE_PREVIEW_MOCK", text: "Podgląd planu liczony w przeglądarce (mock silnika) — docelowo wylicza silnik reguł w API." },
    { code: "ROUNDING_UNCONFIRMED", text: "Kwoty bez zaokrągleń — zasady zaokrąglania ZUS niepotwierdzone (GAP-001)." },
  ];
  const need = (field: string, ...rule_ids: string[]) => {
    missing.push({ field, rule_ids });
    statuses.push("NEEDS_DATA");
  };
  const warn = (code: string, severity: Warning["severity"], rule_id: string, message: string) =>
    warnings.push({ code, severity, rule_id, message });

  const baseRaw = req.income_history?.manual_base_override ?? null;
  const base = baseRaw ? ratio(baseRaw) : null;
  const combined = req.applications?.combined_815_planned === true;
  const titles = req.insurance?.titles;
  const title = titles?.[0];
  const isEmployee = title?.title_type === "EMPLOYMENT_CONTRACT";
  const isSelfEmployed = title?.title_type === "SELF_EMPLOYED";
  const insuredCount = req.payer?.insured_count_on_nov30_prev_year;
  const endedBeforeEvent = !!(title?.to && ev && title.to < ev);
  const payer: PreviewSummary["payer"] = isSelfEmployed || endedBeforeEvent ? "ZUS"
    : insuredCount == null ? null : insuredCount > P.PAYER_INSURED_THRESHOLD ? "CONTRIBUTION_PAYER" : "ZUS";
  const children = req.children ?? {};
  const count = children.count_at_birth ?? children.count_at_event ?? null;
  const zaZyciem = children.za_zyciem_certificate === true;
  const items = children.items ?? [];
  const stillbornCount = items.filter((c) => c.stillborn || c.death_date).length; // martwe urodzenie lub zgon
  const deathDates = items.map((c) => c.death_date).filter((d): d is string => !!d);
  const lateDeath = !!ev && deathDates.some((d) => d >= addDays(ev, P.STILLBIRTH_LEAVE_WEEKS * W));
  const allDead = items.length > 0 && stillbornCount >= (count ?? items.length);
  const allStillborn = allDead && !lateDeath; // MAT-DUR-003
  const lostAfter8w = allDead && lateDeath; // MAT-DUR-004
  const sensitive = stillbornCount > 0;
  let combinedEligible = applicant === "MOTHER";

  // ---------- 1. Ubezpieczenie i wykluczenia ----------
  if (!ev) need("event.date", "MAT-ELIG-001", "MAT-DUR-009");
  if (titles === undefined) need("insurance.titles", "MAT-ELIG-001");
  else if (titles.length === 0 || title?.sickness_insurance_mode === "NONE") {
    statuses.push("NOT_ELIGIBLE");
    reasons.push({ code: "NO_SICKNESS_INSURANCE", rule_id: "MAT-ELIG-001",
      message: "Bez ubezpieczenia chorobowego zasiłek macierzyński nie przysługuje. Do dobrowolnego ubezpieczenia nie można przystąpić wstecz.",
      legal_basis: [{ document: "USTAWA", location: "art. 29 ust. 1" }] });
    warn("NO_SICKNESS_INSURANCE", "CRITICAL", "MAT-ELIG-001",
      "Brak ubezpieczenia chorobowego — sprawdź świadczenie rodzicielskie (wypłacane poza ZUS, ustawa o świadczeniach rodzinnych).");
  } else if (title && ev) {
    const to = title.to ?? null;
    if (title.from && title.from > ev) {
      statuses.push("NEEDS_REVIEW");
      warn("INSURED_AFTER_EVENT", "CRITICAL", "MAT-ELIG-001", "Ubezpieczenie zaczyna się po dacie porodu/przyjęcia dziecka.");
    }
    if (to && to < ev) {
      const reason = title.termination_reason;
      if (reason === "EMPLOYER_LIQUIDATION" || reason === "EMPLOYER_BANKRUPTCY") {
        reasons.push({ code: "ART30_LIQUIDATION", rule_id: "MAT-ELIG-004",
          message: "Umowa ustała w ciąży z powodu likwidacji lub upadłości pracodawcy — do porodu przysługuje zasiłek w wysokości zasiłku macierzyńskiego, a po porodzie zasiłek macierzyński.",
          legal_basis: [{ document: "USTAWA", location: "art. 30 ust. 1 i 3" }] });
        warn("ART30_LIQUIDATION", "INFO", "MAT-ELIG-004", "Likwidacja lub upadłość pracodawcy w ciąży nie odbiera prawa do świadczeń — wypłaca ZUS.");
      } else if (reason === "NOTICE_BY_EMPLOYEE") {
        statuses.push("NEEDS_REVIEW");
        warn("OWN_NOTICE_LOSS", "CRITICAL", "RISK-001",
          "Rozwiązanie umowy przez Ciebie w ciąży oznacza utratę ochrony i ubezpieczenia — bez ubezpieczenia w dniu porodu nie ma zasiłku macierzyńskiego.");
      } else if (req.employment?.contract_type === "FIXED_TERM") {
        const ext = req.employment.extended_until_birth_kp177;
        if (ext === true) {
          reasons.push({ code: "KP177_EXTENDED", rule_id: "MAT-CLS-002",
            message: "Umowa terminowa, która kończy się po 3. miesiącu ciąży, ulega przedłużeniu do dnia porodu.",
            legal_basis: [{ document: "KP", location: "art. 177 § 3" }, { document: "USTAWA", location: "art. 30 ust. 4" }] });
          warn("KP177_EXTENDED", "INFO", "MAT-CLS-002",
            "Umowa przedłuży się do dnia porodu; po porodzie zasiłek macierzyński wypłaca ZUS (ubezpieczenie ustaje).");
        } else if (ext === false) {
          statuses.push("NEEDS_REVIEW");
          warn("CONTRACT_ENDS_BEFORE_BIRTH", "CRITICAL", "MAT-ELIG-001",
            "Umowa kończy się przed porodem i nie przedłuży się (koniec przed upływem 3. miesiąca ciąży). Brak ubezpieczenia w dniu porodu = brak zasiłku macierzyńskiego.");
        } else {
          need("employment.extended_until_birth_kp177", "MAT-CLS-002");
          warn("CONTRACT_ENDS_BEFORE_BIRTH_UNKNOWN", "WARNING", "MAT-CLS-002",
            "Umowa terminowa kończy się przed porodem — odpowiedz, czy koniec przypada po 3. miesiącu ciąży.");
        }
      } else {
        statuses.push("NEEDS_REVIEW");
        warn("NOT_INSURED_ON_EVENT", "CRITICAL", "MAT-ELIG-001", "Ubezpieczenie kończy się przed porodem — wymaga weryfikacji (art. 30).");
      }
    }
    if (isSelfEmployed) {
      const debt = req.debt?.amount_on_right_date ?? null;
      const threshold = mul(ratio(P.MIN_WAGE_2026_MONTHLY), ratio(P.DEBT_THRESHOLD_MIN_WAGE_RATIO));
      if (debt === null) need("debt.amount_on_right_date", "GEN-EXCL-001");
      else if (cmp(ratio(debt), threshold) > 0) {
        statuses.push("NOT_ELIGIBLE");
        reasons.push({ code: "CONTRIBUTION_DEBT", rule_id: "GEN-EXCL-001",
          message: `Zadłużenie składkowe ${debt} zł przekracza próg ${toDecimalString(threshold)} zł (1% minimalnego wynagrodzenia) — zasiłek wstrzymany do czasu spłaty.`,
          legal_basis: [{ document: "USTAWA", location: "art. 2a ust. 1" }] });
        warn("CONTRIBUTION_DEBT", "CRITICAL", "GEN-EXCL-001",
          `Spłać zaległość składkową (próg ${toDecimalString(threshold)} zł). Prawo do zasiłku powstaje od dnia spłaty — nie później niż w 6 miesięcy.`);
      }
      if (wp.started_during_pregnancy) warn("RISK_STARTED_IN_PREGNANCY", "WARNING", "RISK-H1",
        "Działalność lub dobrowolne ubezpieczenie rozpoczęte w ciąży — ZUS może badać, czy działalność jest rzeczywista.");
      if (wp.raised_base_during_pregnancy) warn("RISK_RAISED_BASE", "WARNING", "RISK-H2",
        "Podwyższenie podstawy składek w ciąży — ryzyko zakwestionowania wysokości podstawy przez ZUS.");
      if (wp.gross_salary && cmp(ratio(wp.gross_salary), ratio(P.VOLUNTARY_MAX_CONTRIB_BASE_2026)) > 0)
        warn("VOLUNTARY_BASE_CAP", "WARNING", "BASE-NEMP-001",
          `Podstawa składek ponad limit ${P.VOLUNTARY_MAX_CONTRIB_BASE_2026} zł — do zasiłku przyjmuje się nie więcej niż limit po odliczeniu 13,71%.`);
      warn("VOLUNTARY_DEREGISTRATION", "INFO", "GEN-INFO-001",
        "W czasie pobierania zasiłku macierzyńskiego nie podlegasz dobrowolnemu chorobowemu — po zakończeniu zgłoś się ponownie (ZUS ZUA/ZZA).");
      if (title.from && ev && periodDays(title.from, ev) <= P.WAITING_DAYS_VOLUNTARY)
        warn("WAITING_PERIOD_VOLUNTARY", "INFO", "SICK-ELIG-003",
          "Zasiłek chorobowy w ciąży (L4) z dobrowolnego ubezpieczenia przysługuje dopiero po 90 dniach ubezpieczenia; macierzyński nie wymaga okresu wyczekiwania.");
    } else if (title.sickness_insurance_mode == null) need("insurance.titles[0].sickness_insurance_mode", "MAT-ELIG-001");
  }
  if (!base) need("income_history.manual_base_override", "CALC-MAT-001");
  if (count == null) need(eventType === "BIRTH" ? "children.count_at_birth" : "children.count_at_event", "MAT-DUR-001");

  // Przyjęcie dziecka: limity wieku
  if (eventType === "ADOPTION" || eventType === "FOSTER") {
    combinedEligible = true;
    const age = wp.child_age_years;
    if (eventType === "FOSTER" && req.event.foster_family_type === "PROFESSIONAL") {
      statuses.push("NOT_ELIGIBLE");
      reasons.push({ code: "PROFESSIONAL_FOSTER", rule_id: "MAT-ELIG-005",
        message: "Zawodowa rodzina zastępcza nie ma prawa do urlopu ani zasiłku na warunkach macierzyńskiego.",
        legal_basis: [{ document: "USTAWA", location: "art. 29 ust. 1 pkt 3" }] });
    } else if (age == null) need("children.items[].birth_date", "MAT-ELIG-005");
    else {
      const limit = eventType === "ADOPTION" ? P.ADOPTION_CHILD_AGE_MAX
        : children.school_obligation_deferred ? P.FOSTER_CHILD_AGE_MAX_SCHOOL_DEFERRED : P.FOSTER_CHILD_AGE_MAX;
      if (age >= limit) {
        statuses.push(eventType === "FOSTER" ? "NEEDS_REVIEW" : "NOT_ELIGIBLE");
        reasons.push({ code: "CHILD_AGE_LIMIT", rule_id: "MAT-ELIG-005",
          message: `Wiek dziecka (${age} l.) przekracza limit ${limit} lat dla tej formy przyjęcia.`,
          legal_basis: [{ document: "KP", location: "art. 183" }, { document: "USTAWA", location: "art. 29 ust. 1 pkt 2-3" }] });
        if (eventType === "FOSTER") warn("KP183_3_REVIEW", "WARNING", "MAT-DUR-007",
          "Dla dziecka ponad limit wieku może przysługiwać krótszy wymiar (9 tyg. + 38 tyg.) — interpretacja KP art. 183 § 3 do potwierdzenia.");
      }
    }
  }

  const status = worst(statuses);
  const segments: Seg[] = [];
  let parentalPool: number | null = null;
  let remaining: PreviewSummary["remaining"] = null;

  // ---------- 2. Okresy (oś czasu) ----------
  if (ev && count != null && status !== "NOT_ELIGIBLE") {
    const multiple = count > 1;
    const aliveCount = Math.max(count - stillbornCount, 0);
    parentalPool = allDead ? null
      : zaZyciem ? (multiple ? P.PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE : P.PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE)
        : multiple ? P.PARENTAL_WEEKS_MULTIPLE : P.PARENTAL_WEEKS_SINGLE;
    const reserved = P.PARENTAL_NONTRANSFERABLE_WEEKS;
    const mOwn = applicant === "MOTHER";
    const fOwn = applicant === "FATHER";
    const motherUninsured = applicant === "FATHER" && req.mother?.sickness_insured === false;
    const rateMat = combined ? P.MAT_RATE_COMBINED : P.MAT_RATE_FULL;
    const ratePar = combined ? P.MAT_RATE_COMBINED : P.MAT_RATE_PARENTAL;
    if (applicant === "FATHER" && req.mother?.sickness_insured == null) need("mother.sickness_insured", "PAR-ELIG-001");

    const matLeave: LeaveType = eventType === "BIRTH" ? "MATERNITY_LEAVE" : "MATERNITY_LIKE_LEAVE";
    const matWeeks = allStillborn ? P.STILLBIRTH_LEAVE_WEEKS : maternityWeeks(Math.max(aliveCount, 1));
    const matDays = matWeeks * W;
    // Tryb „co zostało”: dziecko urodzone, a macierzyński już minął albo coś z rodzicielskiego wykorzystano.
    const history = wp.used_maternity_fully !== null && eventType === "BIRTH" && ev < today
      && (addDays(ev, matDays) <= today || wp.used_parental_mother_weeks + wp.used_parental_father_weeks + wp.used_parts > 0);

    if (allStillborn) {
      // MAT-DUR-004: 8 tyg. po porodzie, nie krócej niż 7 dni od zgonu
      const lastDeath = deathDates.sort().at(-1);
      const end = lastDeath ? maxDate(addDays(ev, matDays - 1), addDays(lastDeath, P.CHILD_DEATH_MIN_DAYS - 1)) : addDays(ev, matDays - 1);
      segments.push(mkSeg("MOTHER", "MATERNITY_LEAVE", ev, periodDays(ev, end), P.MAT_RATE_FULL, mOwn, { rule_ids: ["MAT-DUR-003"] }));
      combinedEligible = false;
      reasons.push({ code: "STILLBIRTH_8W", rule_id: "MAT-DUR-003",
        message: `Przysługuje ${P.STILLBIRTH_LEAVE_WEEKS} tygodni urlopu i zasiłku macierzyńskiego po porodzie, w wysokości 100% podstawy.`,
        legal_basis: [{ document: "KP", location: "art. 180(1) § 1" }] });
    } else if (lostAfter8w) {
      const death = deathDates.sort().at(-1)!;
      const end = minDate(addDays(ev, matDays - 1), addDays(death, P.CHILD_DEATH_MIN_DAYS - 1));
      segments.push(mkSeg("MOTHER", "MATERNITY_LEAVE", ev, periodDays(ev, end), P.MAT_RATE_FULL, mOwn, { rule_ids: ["MAT-DUR-004"] }));
      combinedEligible = false;
      reasons.push({ code: "CHILD_DEATH_7D", rule_id: "MAT-DUR-004",
        message: `Po zgonie dziecka prawo do urlopu i zasiłku macierzyńskiego zachowujesz przez ${P.CHILD_DEATH_MIN_DAYS} dni od dnia zgonu.`,
        legal_basis: [{ document: "KP", location: "art. 180(1) § 2" }] });
    } else if (stillbornCount > 0) {
      warn("PARTIAL_STILLBIRTH", "INFO", "MAT-DUR-005",
        "Wymiar urlopu ustala się według liczby dzieci pozostałych przy życiu, nie krócej niż 7 dni od dnia zgonu.");
    }

    if (history && parentalPool !== null) {
      // ---- S3: co już wykorzystano, ile zostało i do kiedy ----
      const usedM = wp.used_parental_mother_weeks;
      const usedF = wp.used_parental_father_weeks;
      const partsUsed = wp.used_parts;
      if (wp.used_maternity_fully) segments.push(mkSeg("MOTHER", matLeave, ev, matDays, P.MAT_RATE_FULL, false, { history: true }));
      let cursor = addDays(ev, matDays);
      if (usedM > 0) {
        segments.push(mkSeg("MOTHER", "PARENTAL_LEAVE", cursor, usedM * W, P.MAT_RATE_PARENTAL, false, { history: true }));
        cursor = addDays(cursor, usedM * W);
      }
      if (usedF > 0) segments.push(mkSeg("FATHER", "PARENTAL_LEAVE", cursor, usedF * W, P.MAT_RATE_PARENTAL, false, { history: true }));
      const total = Math.max(parentalPool - usedM - usedF, 0);
      const motherCan = Math.max(Math.min(parentalPool - reserved - usedM, total - Math.max(reserved - usedF, 0)), 0);
      const fatherCan = Math.max(Math.min(parentalPool - reserved - usedF, total), 0);
      const partsLeft = Math.max(P.PARENTAL_MAX_PARTS - partsUsed, 0);
      const finalDate = endOfYear(yearOf(ev) + P.PARENTAL_CHILD_AGE_YEAR_LIMIT);
      const latestStart = addDays(finalDate, -(total * W) + 1);
      const latestApplication = addDays(latestStart, -PO.PARENTAL_APP_DAYS_BEFORE);
      remaining = { totalWeeks: total, motherWeeks: motherCan, fatherWeeks: fatherCan, partsLeft, finalDate,
        latestContinuousStart: latestStart, latestApplication };
      // stawka dla dalszej części
      let rate: string = wp.used_variant === "COMBINED_815" ? P.MAT_RATE_COMBINED : P.MAT_RATE_PARENTAL;
      const firstBirthday = addMonths(ev, 12);
      if (wp.used_variant === "COMBINED_815" && usedM + usedF === 0 && today >= firstBirthday) {
        rate = P.MAT_RATE_PARENTAL;
        warn("RATE_815_NO_PARENTAL_FIRST_YEAR", "WARNING", "RATE-MAT-005",
          "W 1. roku życia dziecka nie wykorzystano rodzicielskiego przy wariancie 81,5% — za rodzicielski przysługuje 70%, a za macierzyński należy się wyrównanie do 100% na wniosek.");
        deadlines.push({ code: "RATE_MAT_TOPUP_APPLICATION", date: today, who: "MOTHER", rule_id: "RATE-MAT-006" });
      }
      if (wp.used_variant === null) warn("USED_VARIANT_UNKNOWN", "INFO", "RATE-MAT-003",
        "Nie wiemy, jaki wariant wypłaty wybrano — stawkę pozostałej części można sprawdzić w PUE/eZUS (symulacja).");
      if (partsLeft === 0) {
        planErrors.push({ code: "PARENTAL_PARTS_EXHAUSTED", rule_id: "PAR-DUR-003" });
        warn("PARENTAL_PARTS_EXHAUSTED", "CRITICAL", "PAR-DUR-003",
          `Wykorzystano już ${P.PARENTAL_MAX_PARTS} części urlopu rodzicielskiego — kolejny wniosek zostanie odrzucony.`);
      } else warn("PARENTAL_PARTS_LEFT", "INFO", "PAR-DUR-003",
        `Każdy wniosek to osobna część. Zostało ${partsLeft} z ${P.PARENTAL_MAX_PARTS} części na rodzinę — kolejna ponad limit oznacza odmowę.`);
      if (finalDate < today) warn("PARENTAL_TOO_LATE", "CRITICAL", "PAR-DUR-002", "Minął termin wykorzystania urlopu rodzicielskiego.");
      warn("MUST_STAY_INSURED", "INFO", "PAR-ELIG-001",
        "Zasiłek za dalszą część rodzicielskiego przysługuje, jeśli nadal podlegasz ubezpieczeniu chorobowemu. Urlop wychowawczy nie daje zasiłku.");
      const planStart = maxDate(addDays(today, PO.PARENTAL_APP_DAYS_BEFORE), addDays(ev, matDays));
      if (motherCan > 0 && partsLeft > 0 && finalDate >= planStart) {
        const days = Math.min(motherCan * W, periodDays(planStart, finalDate));
        segments.push(mkSeg("MOTHER", "PARENTAL_LEAVE", planStart, days, rate, mOwn));
        deadlines.push({ code: "PARENTAL_APPLICATION", date: addDays(planStart, -PO.PARENTAL_APP_DAYS_BEFORE), who: "MOTHER", rule_id: "PAR-DUR-001" });
      }
      deadlines.push({ code: "PARENTAL_LATEST_CONTINUOUS_APPLICATION", date: latestApplication, who: "MOTHER/FATHER", rule_id: "PAR-DUR-002" });
      deadlines.push({ code: "PARENTAL_FINAL_DATE", date: finalDate, who: "MOTHER/FATHER", rule_id: "PAR-DUR-002" });
      combinedEligible = false;
    } else if (!allDead && parentalPool !== null) {
      // ---- planowanie od zdarzenia ----
      let matStart = req.plan?.maternity_start_date ?? ev;
      if (eventType === "BIRTH" && matStart < addDays(ev, -P.PRE_BIRTH_MAX_WEEKS * W)) {
        planErrors.push({ code: "PRE_BIRTH_TOO_EARLY", rule_id: "MAT-DUR-008", segment_index: 0 });
        matStart = ev;
      }
      if (matStart > ev) {
        planErrors.push({ code: "MATERNITY_START_AFTER_BIRTH", rule_id: "MAT-DUR-009", segment_index: 0 });
        matStart = ev;
      }
      const matEnd = addDays(matStart, matDays - 1);
      if (motherUninsured) {
        reasons.push({ code: "MOTHER_NOT_INSURED", rule_id: "PAR-ELIG-001",
          message: "Mama nie jest ubezpieczona — tata ma prawo do zasiłku za urlop rodzicielski i ojcowski.",
          legal_basis: [{ document: "USTAWA", location: "art. 29 ust. 1 pkt 4; art. 31 ust. 3h" }] });
        warn("FATHER_PARENTAL_START_REVIEW", "WARNING", "PAR-ELIG-001",
          "Gdy mama nie ma urlopu macierzyńskiego, początek rodzicielskiego taty i pula tygodni wymagają potwierdzenia.");
      } else if (wp.father_takes_over_maternity && eventType === "BIRTH") {
        const motherDays = P.MOTHER_MIN_WEEKS_BEFORE_TRANSFER * W;
        segments.push(mkSeg("MOTHER", matLeave, matStart, periodDays(matStart, addDays(ev, motherDays - 1)), rateMat, mOwn));
        const fromF = addDays(ev, motherDays);
        segments.push(mkSeg("FATHER", "MATERNITY_LEAVE_TRANSFERRED", fromF, periodDays(fromF, matEnd), rateMat, fOwn,
          { rule_ids: ["MAT-TRF-001"] }));
        warn("TRANSFER_AFTER_14W", "INFO", "MAT-TRF-001",
          `Mama musi wykorzystać co najmniej ${P.MOTHER_MIN_WEEKS_BEFORE_TRANSFER} tyg. po porodzie; resztę przejmuje tata na podstawie jej rezygnacji i swojego wniosku.`);
      } else {
        segments.push(mkSeg("MOTHER", matLeave, matStart, matDays, rateMat, mOwn,
          { rule_ids: eventType === "BIRTH" ? ["MAT-DUR-001", "MAT-DUR-009"] : ["MAT-DUR-006"] }));
      }

      // uzupełniający (wcześniak / hospitalizacja)
      let cursor = addDays(matEnd, 1);
      const gw = req.birth?.completed_gestation_weeks ?? null;
      const weight = items.find((c) => !c.stillborn)?.birth_weight_g ?? null;
      if (eventType === "BIRTH" && (req.birth || wp.hospital_weeks != null)) {
        const early = (gw != null && gw < P.SUPP_GESTATION_EARLY_WEEK) || (weight != null && weight <= P.SUPP_WEIGHT_THRESHOLD_G);
        const preterm = gw != null && gw < P.SUPP_GESTATION_TERM_WEEK;
        const cap = early ? P.SUPP_CAP_WEEK_EARLY : preterm ? P.SUPP_CAP_WEEK_PRETERM
          : wp.late_hospital_qualifies ? P.SUPP_CAP_WEEK_PRETERM : 0;
        if (gw == null && weight == null) need("birth.completed_gestation_weeks", "SUPP-ELIG-001");
        else if (wp.hospital_weeks == null) need("children.hospital_stays", "SUPP-CALC-001");
        else if (cap > 0 && wp.hospital_weeks > 0) {
          const weeks = Math.min(wp.hospital_weeks, cap);
          const s = mkSeg("MOTHER", "SUPPLEMENTARY_MATERNITY_LEAVE", cursor, weeks * W, P.MAT_RATE_FULL, mOwn);
          segments.push(s);
          cursor = addDays(s.to, 1);
          reasons.push({ code: "SUPPLEMENTARY", rule_id: "SUPP-CALC-001",
            message: `Urlop uzupełniający: ${weeks} tyg. (hospitalizacja ${wp.hospital_weeks} tyg., limit ${cap} tyg.), bezpośrednio po macierzyńskim, 100% podstawy.`,
            legal_basis: [{ document: "KP", location: "art. 180(2)" }] });
          deadlines.push({ code: "SUPPLEMENTARY_APPLICATION", date: addDays(matEnd, -PO.SUPP_APP_DAYS_BEFORE_MAT_END), who: "MOTHER", rule_id: "SUPP-COND-001" });
          warn("SUPP_APPLICATION_DEADLINE", "WARNING", "SUPP-COND-001",
            "Wniosek o urlop uzupełniający złóż co najmniej 21 dni przed końcem macierzyńskiego, z zaświadczeniem ze szpitala. Przy kilkorgu dzieci liczy się najdłuższa hospitalizacja.");
          docs.push({ doc_type: "HOSPITAL_STAY_CERTIFICATE", rule_id: "SUPP-COND-001", submit_to: isEmployee ? "EMPLOYER" : "ZUS", provider: "Szpital" });
        } else if (cap === 0 && wp.hospital_weeks != null) {
          warn("SUPP_NOT_QUALIFIED", "INFO", "SUPP-ELIG-003",
            "Dziecko urodzone o czasie: urlop uzupełniający przysługuje tylko przy pobycie w szpitalu ≥2 dni rozpoczętym między 5. a 28. dniem życia.");
        }
      }

      // rodzicielski
      const fatherWeeks = Math.min(Math.max(wp.father_parental_weeks, 0), parentalPool - reserved);
      const motherWeeks = motherUninsured ? 0 : parentalPool - Math.max(reserved, fatherWeeks);
      const f = wp.work_fraction ?? "0";
      const workWeeks = wp.work_weeks ?? 0;
      if (motherWeeks > 0) {
        if (f !== "0" && workWeeks > 0 && applicant === "MOTHER") {
          const consumed = mul(ratio(workWeeks * W), sub(ratio(1), ratio(f)));
          const fullDays = motherWeeks * W - Number(toDecimalString(consumed, 0));
          if (cmp(ratio(f), ratio(P.PARENTAL_WORK_MAX_FRACTION)) > 0) planErrors.push({ code: "WORK_FRACTION_TOO_HIGH", rule_id: "PAR-WORK-001" });
          if (fullDays < 0) planErrors.push({ code: "WORK_WEEKS_EXCEED_POOL", rule_id: "PAR-WORK-002" });
          else {
            if (fullDays > 0) {
              const s = mkSeg("MOTHER", "PARENTAL_LEAVE", cursor, fullDays, ratePar, mOwn);
              segments.push(s);
              cursor = addDays(s.to, 1);
            }
            const ws = mkSeg("MOTHER", "PARENTAL_LEAVE", cursor, workWeeks * W, ratePar, mOwn, { work_fraction: f, rule_ids: ["PAR-WORK-001", "PAR-WORK-002"] });
            segments.push(ws);
            deadlines.push({ code: "WORK_DURING_PARENTAL_APPLICATION", date: addDays(ws.from, -PO.WORK_APP_DAYS_BEFORE), who: "MOTHER", rule_id: "PAR-WORK-003" });
            warn("WORK_DURING_PARENTAL", "INFO", "PAR-WORK-003",
              "Łączenie z pracą wydłuża urlop proporcjonalnie. Wniosek złóż co najmniej 21 dni przed podjęciem pracy; pracodawca może odmówić ze względu na organizację pracy.");
            cursor = addDays(ws.to, 1);
            const calendarWeeks = (fullDays + workWeeks * W) / W;
            const capKey = zaZyciem ? (multiple ? "za_zyciem_multiple" : "za_zyciem_single") : multiple ? "multiple" : "single";
            if (calendarWeeks > P.PARENTAL_EXT_CAP[capKey]) planErrors.push({ code: "PARENTAL_EXT_CAP_EXCEEDED", rule_id: "PAR-WORK-002" });
          }
        } else {
          const s = mkSeg("MOTHER", "PARENTAL_LEAVE", cursor, motherWeeks * W, ratePar, mOwn);
          segments.push(s);
          cursor = addDays(s.to, 1);
        }
        const parStart = segments.find((s) => s.parent === "MOTHER" && s.leave_type === "PARENTAL_LEAVE")?.from;
        if (parStart) deadlines.push({ code: "PARENTAL_APPLICATION_IF_SEPARATE", date: addDays(parStart, -PO.PARENTAL_APP_DAYS_BEFORE), who: "MOTHER", rule_id: "PAR-DUR-001" });
      }
      // część taty
      if (fatherWeeks > 0 || motherUninsured) {
        const fw = motherUninsured ? Math.max(fatherWeeks, reserved) : fatherWeeks;
        const fStart = motherUninsured ? addDays(ev, matDays) : cursor;
        const reservedDays = Math.min(fw, reserved) * W;
        const extraDays = (fw - Math.min(fw, reserved)) * W;
        const r = mkSeg("FATHER", "PARENTAL_LEAVE", fStart, reservedDays, P.MAT_RATE_PARENTAL, fOwn,
          { reserved_9w: true, rule_ids: ["PAR-SHARE-002", "RATE-MAT-004"] });
        segments.push(r);
        if (extraDays > 0) {
          segments.push(mkSeg("FATHER", "PARENTAL_LEAVE", addDays(r.to, 1), extraDays, P.MAT_RATE_PARENTAL, fOwn,
            { needs_review: combined, rule_ids: combined ? ["RATE-MAT-008"] : ["RATE-MAT-002"] }));
          if (combined) warn("FATHER_RATE_UNDER_815", "WARNING", "RATE-MAT-008",
            "Przy wariancie 81,5% stawka taty za tygodnie przekazane przez mamę nie wynika jednoznacznie z przepisów — przyjęto 70%, wymaga weryfikacji.");
        }
        deadlines.push({ code: "FATHER_PARENTAL_APPLICATION", date: addDays(fStart, -PO.PARENTAL_APP_DAYS_BEFORE), who: "FATHER", rule_id: "PAR-DUR-001" });
      }
      if (!motherUninsured && fatherWeeks < reserved) warn("RESERVED_9W_LOST", "INFO", "PAR-SHARE-002",
        `${reserved} tygodni rodzicielskiego przysługuje wyłącznie tacie — jeśli ich nie weźmie, przepadają.`);

      // ojcowski
      if (eventType === "BIRTH" || eventType === "ADOPTION") {
        const pStart = req.plan?.paternity_start_date ?? maxDate(ev, addDays(today, PO.PATERNITY_APP_DAYS_BEFORE));
        const p = mkSeg("FATHER", "PATERNITY_LEAVE", pStart, P.PATERNITY_WEEKS * W, P.MAT_RATE_FULL, fOwn);
        segments.push(p);
        const limit = addDays(addMonths(ev, P.PATERNITY_CHILD_AGE_MONTHS), -1);
        deadlines.push({ code: "PATERNITY_APPLICATION", date: addDays(pStart, -PO.PATERNITY_APP_DAYS_BEFORE), who: "FATHER", rule_id: "PAT-DUR-001" });
        deadlines.push({ code: "PATERNITY_LATEST_END", date: limit, who: "FATHER", rule_id: "PAT-DUR-001" });
        if (p.to > limit) planErrors.push({ code: "PATERNITY_AFTER_12_MONTHS", rule_id: "PAT-DUR-001" });
      }
      deadlines.push({ code: "PARENTAL_FINAL_DATE", date: endOfYear(yearOf(ev) + P.PARENTAL_CHILD_AGE_YEAR_LIMIT), who: "MOTHER/FATHER", rule_id: "PAR-DUR-002" });
    }

    // Wniosek 81,5%
    if (combinedEligible && !history) {
      const dl = addDays(ev, P.APP_COMBINED_DEADLINE_DAYS);
      deadlines.push({ code: "APP_COMBINED_815", date: dl, who: "MOTHER", rule_id: "APP-DL-001" });
      if (dl < today) warn("APP_COMBINED_815_PASSED", "INFO", "APP-DL-001", "Termin na wniosek o 81,5% minął — obowiązuje wariant 100% / 70%.");
    }
    if (eventType === "BIRTH" && applicant === "MOTHER" && !history && !allDead) {
      const earliest = addDays(ev, -P.PRE_BIRTH_MAX_WEEKS * W);
      if (ev >= today) warn("PRE_BIRTH_OPTION", "INFO", "MAT-DUR-008",
        earliest < today
          ? "Urlop macierzyński możesz zacząć w dowolnym dniu do porodu; jeśli nie złożysz wniosku wcześniej, zaczyna się w dniu porodu."
          : `Urlop możesz zacząć najwcześniej ${earliest} (6 tyg. przed porodem); inaczej zaczyna się w dniu porodu.`);
    }
  }

  // ---------- 3. Dokumenty i ochrona ----------
  if (ev && status !== "NOT_ELIGIBLE") {
    const submitBenefit: Doc["submit_to"] = isEmployee || title?.title_type === "CIVIL_CONTRACT_MANDATE" ? "EMPLOYER" : "ZUS";
    const own = segments.filter((s) => s.parent === applicant && !s.history);
    if (applicant === "MOTHER" && own.some((s) => s.leave_type.startsWith("MATERNITY")))
      docs.push({ doc_type: allStillborn && deathDates.length === 0 ? "STILLBIRTH_CERTIFICATE" : allDead ? "DEATH_CERTIFICATE" : eventType === "BIRTH" ? "BIRTH_CERTIFICATE_SHORT" : "COURT_OR_PLACEMENT_CERTIFICATE",
        rule_id: "MAT-DOC-001", submit_to: submitBenefit, provider: allDead ? "Szpital / lekarz / USC" : eventType === "BIRTH" ? "USC (odpis skrócony do wglądu — symulacja)" : "Sąd / starosta", obtainable_by_zus: eventType === "BIRTH" && !allDead });
    if (isEmployee && own.some((s) => s.leave_type !== "PATERNITY_LEAVE"))
      docs.push({ doc_type: combined ? "LEAVE_APPLICATION_MATERNITY_AND_PARENTAL" : "LEAVE_APPLICATION_MATERNITY", rule_id: "APP-DOC-001", submit_to: "EMPLOYER", provider: "Ty" });
    if (!isEmployee && applicant === "MOTHER") docs.push({ doc_type: "ZAM_APPLICATION", rule_id: "APP-DOC-002", submit_to: submitBenefit, provider: "Ty (eZUS)" });
    if (combined && applicant === "MOTHER" && combinedEligible) docs.push({ doc_type: "APPLICATION_COMBINED_815", rule_id: "APP-DL-001", submit_to: submitBenefit, provider: "Ty" });
    if (applicant === "FATHER") {
      docs.push({ doc_type: "LEAVE_APPLICATION_PATERNITY", rule_id: "PAT-DUR-001", submit_to: isEmployee ? "EMPLOYER" : "ZUS", provider: "Ty" });
      if (own.some((s) => s.leave_type === "PARENTAL_LEAVE")) docs.push({ doc_type: "LEAVE_APPLICATION_PARENTAL", rule_id: "PAR-DUR-001", submit_to: isEmployee ? "EMPLOYER" : "ZUS", provider: "Ty" });
    }
    if (payer === "ZUS" && isEmployee) docs.push({ doc_type: "PAYER_CERTIFICATE_Z3", rule_id: "APP-DOC-003", submit_to: "ZUS", provider: "Pracodawca (przekazuje do ZUS w 7 dni)" });
    if (isEmployee && applicant === "MOTHER") warn("KP177_PROTECTION", "INFO", "KP-177",
      "Od złożenia wniosku o urlop do jego końca pracodawca nie może wypowiedzieć ani rozwiązać z Tobą umowy (KP art. 177, art. 186(8)).");
    if (payer === null && (isEmployee || title?.title_type === "CIVIL_CONTRACT_MANDATE")) need("payer.insured_count_on_nov30_prev_year", "APP-DOC-003");
  }

  // ---------- 4. Kwoty ----------
  let ownTotal: Ratio | null = null;
  if (base) {
    calcSteps.push({ label: "Podstawa wymiaru (miesięcznie)", value: toDecimalString(base),
      basis: wp.gross_salary ? `${wp.gross_salary} zł brutto × (1 − ${plPercent(P.CONTRIBUTION_DEDUCTION_RATE)}) — USTAWA art. 36, 3 pkt 3` : "podana ręcznie" });
    for (const rate of [...new Set(segments.filter((s) => s.own).map((s) => s.rate))])
      calcSteps.push({ label: `Zasiłek za dzień przy ${plPercent(rate)}`, value: toDecimalString(div(mul(base, ratio(rate)), ratio(P.MONTH_AS_DAYS))),
        basis: `podstawa × ${rate} ÷ ${P.MONTH_AS_DAYS} — USTAWA art. 31, 36 ust. 3` });
    for (const s of segments) if (s.own && !s.history) s.amount = toDecimalString(segAmount(s, base));
    ownTotal = sum(segments.filter((s) => s.own && !s.history).map((s) => segAmount(s, base)));
  }

  const benefits: Benefit[] = groupBenefits(segments, base, status, reasons, payer, req.evaluation?.mode === "FORECAST", applicant);
  const lastOf = (p: Parent) => segments.filter((s) => s.parent === p && !s.history).map((s) => s.to).sort().at(-1);
  const rtw = (["MOTHER", "FATHER"] as Parent[]).flatMap((p) => {
    const last = lastOf(p);
    return last ? [{ parent: p, date: addDays(last, 1), part_time_fraction: null }] : [];
  });

  const response: EvaluateResponse = {
    evaluation_id: crypto.randomUUID(),
    ruleset_version: "fe-preview",
    law_reference_date: today,
    engine: "fe-preview-mock",
    overall_status: status,
    mode: req.evaluation?.mode,
    benefits,
    missing_data: missing,
    assumptions,
    not_evaluated_rules: ["BASE-EMP-001 (pełna historia wynagrodzeń)", "RATE-MAT-007", "MAT-TRF-* (przypadki szczególne)", "SICK-*"],
    deadlines: deadlines.sort((a, b) => a.date.localeCompare(b.date)),
    warnings,
    missing_documents: docs,
    plan_errors: planErrors,
    return_to_work: rtw,
  };
  return {
    response,
    summary: {
      applicant, payer, base: base ? toDecimalString(base) : null, parentalPoolWeeks: parentalPool,
      nonTransferableWeeks: P.PARENTAL_NONTRANSFERABLE_WEEKS, maxParts: P.PARENTAL_MAX_PARTS,
      partsUsed: remaining ? wp.used_parts : null, remaining,
      ownTotal: ownTotal ? toDecimalString(ownTotal) : null, segments, calcSteps, sensitive, combinedEligible,
    },
  };
}

function groupBenefits(segments: Seg[], base: Ratio | null, status: Status, reasons: Reason[],
  payer: PreviewSummary["payer"], forecast: boolean, applicant: Parent): Benefit[] {
  const groups = new Map<string, Seg[]>();
  for (const s of segments.filter((x) => !x.history)) {
    const key = `${s.parent}|${s.leave_type}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups.entries()].map(([key, segs]) => {
    const [parent, leave] = key.split("|");
    const own = parent === applicant;
    const totals = base && own ? sum(segs.map((s) => segAmount(s, base))) : null;
    const days = segs.reduce((n, s) => n + s.days, 0);
    return {
      benefit_type: "MATERNITY_BENEFIT",
      leave_type: leave,
      status: own ? (segs.some((s) => s.needs_review) ? "NEEDS_REVIEW" : status) : "NEEDS_DATA",
      rate: segs[0].rate,
      period: { from: segs[0].from, to: segs.at(-1)!.to, max_weeks: Math.round(days / W) },
      days,
      daily_amount_exact: base && own ? toDecimalString(div(mul(base, ratio(segs[0].rate)), ratio(P.MONTH_AS_DAYS))) : null,
      total_amount_exact: totals ? toDecimalString(totals) : null,
      payer_of_benefit: own ? payer : null,
      forecast,
      reasons: own ? reasons.filter((r) => leave.startsWith("MATERNITY") || r.code !== "STILLBIRTH_8W") : [
        { code: "OTHER_PARENT_DATA", rule_id: "PAR-SHARE-001", message: "Kwota zależy od podstawy wymiaru drugiego rodzica i jego ubezpieczenia." }],
      applied_rules: [...new Set(segs.flatMap((s) => s.rule_ids))],
      segments: segs.map((s) => ({
        parent: s.parent, leave_type: s.leave_type, from: s.from, to: s.to, days: s.days, rate: s.rate,
        work_fraction: s.work_fraction,
        daily_amount_exact: base && s.own ? toDecimalString(div(mul(mul(base, ratio(s.rate)), sub(ratio(1), ratio(s.work_fraction))), ratio(P.MONTH_AS_DAYS))) : null,
        total_amount_exact: base && s.own ? toDecimalString(segAmount(s, base)) : null,
        total_amount_rounded: null,
        payer_of_benefit: s.own ? payer : null,
        rule_ids: s.rule_ids,
      })),
    } satisfies Benefit;
  });
}

/** Porównanie wariantów wypłaty — dwa wywołania tej samej oceny. */
export function compareTotals(a: string | null, b: string | null): { diff: string; better: "A" | "B" | "EQUAL" } | null {
  if (!a || !b) return null;
  const d = sub(ratio(a), ratio(b));
  const c = cmp(d, ratio(0));
  return { diff: toDecimalString(c < 0 ? sub(ratio(0), d) : d), better: c > 0 ? "A" : c < 0 ? "B" : "EQUAL" };
}

/** Czy różnica jest pomijalna względem sumy (próg UX 0,5%, nie wartość prawna). */
export function negligible(diff: string, total: string): boolean {
  return cmp(mul(ratio(diff), ratio(200)), ratio(total)) < 0;
}


