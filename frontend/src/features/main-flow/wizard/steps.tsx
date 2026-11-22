"use client";

// Kroki kreatora: najpierw pytania, które wykluczają całe gałęzie (kim jesteś → etap → zdarzenie → ubezpieczenie).
// Każdy krok ma warunek widoczności - pytanie pojawia się tylko wtedy, gdy ma znaczenie dla wyniku.
import { useId } from "react";
import { formatDate, formatMoney } from "@/lib/format";
import { maternityWeeks } from "../preview/engine";
import { PARAMS } from "../preview/params";
import { addDays, daysBetween } from "../preview/exact";
import { type Answers, extendableUntilBirth, hasContractEnd } from "./answers";
import { Check, Choice, DateField, Field, MoneyField, NumberSelect, Slider, TRI_OPTIONS, inputCls, moneyError } from "./fields";
import { dateErrors, dateWarnings, hasErrors } from "./validation";
import { Optimizer, optimizerVisible } from "./Optimizer";
import { normalizeMoney } from "./money";
import { noInsuranceReason, todayIso } from "./request";
import { ZusFetch } from "./ZusFetch";

const plYears = (n: number) => `${n} ${n === 1 ? "rok" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "lata" : "lat"}`;
const weeksBefore = (a: Answers): string => {
  if (!a.maternityStart || !a.eventDate) return "0";
  const d = daysBetween(a.maternityStart, a.eventDate);
  return d % PARAMS.WEEK_AS_DAYS === 0 && d >= 0 && d <= PARAMS.PRE_BIRTH_MAX_WEEKS * PARAMS.WEEK_AS_DAYS
    ? String(d / PARAMS.WEEK_AS_DAYS) : "custom";
};
// FE1-05: masa urodzeniowa liczy się tylko względem progu (KP art. 180(2) § 1) - pytanie z opcjami zamiast suwaka.
// FE1-37: funkcje - próg z panelu admina (apiParams) czytany przy renderze, nie przy ładowaniu modułu
const weightLimit = () => `${PARAMS.SUPP_WEIGHT_THRESHOLD_G.toLocaleString("pl-PL")} g`;
const weightOptions = () => [
  { value: "YES" as const, label: `Do ${weightLimit()}` },
  { value: "NO" as const, label: `Powyżej ${weightLimit()}` },
  { value: "UNKNOWN" as const, label: "Nie wiem" },
];
/** Przy porodzie przed SUPP_GESTATION_EARLY_WEEK masa nie zmienia wyniku (SUPP-ELIG-001 i tak przysługuje). */
const weightMatters = (a: Answers) => a.gestationWeeks === "" || Number(a.gestationWeeks) >= PARAMS.SUPP_GESTATION_EARLY_WEEK;
/** FE1-12: przyjęcie dziecka ponad granicę wieku (KP art. 183 § 3) - rodzicielski 38 / 62 tyg. (PAR-DUR-003); ten sam warunek
 * co `kp183Case` w preview/engine.ts. Dotyczy suwaka w kroku „Plany” (krok „Co już wykorzystano” jest tylko dla mamy po porodzie). */
/** FE1-26: pełne lata między datami ISO (wiek dziecka w dniu przyjęcia). */
function fullYears(birth: string, on: string): number {
  const [by, bm, bd] = birth.split("-").map(Number);
  const [oy, om, od] = on.split("-").map(Number);
  return Math.max(oy - by - (om < bm || (om === bm && od < bd) ? 1 : 0), 0);
}

const kp183Case = (a: Answers) => a.role === "GUARDIAN" && a.guardianKind === "FOSTER_NON_PROFESSIONAL" && a.childAgeYears !== ""
  && Number(a.childAgeYears) >= (a.schoolDeferred === "YES" ? PARAMS.FOSTER_CHILD_AGE_MAX_SCHOOL_DEFERRED : PARAMS.FOSTER_CHILD_AGE_MAX);
const parentalPool = (a: Answers) => kp183Case(a)
  ? (a.zaZyciem ? PARAMS.PARENTAL_WEEKS_ADOPT_GUARANTEED_ZA_ZYCIEM : PARAMS.PARENTAL_WEEKS_ADOPT_GUARANTEED)
  : a.zaZyciem
    ? (a.children > 1 ? PARAMS.PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE : PARAMS.PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE)
    : (a.children > 1 ? PARAMS.PARENTAL_WEEKS_MULTIPLE : PARAMS.PARENTAL_WEEKS_SINGLE);
/** FE1-12: górna granica tygodni rodzica - suma ≤ pula i nie ruszamy tygodni nieprzenoszalnych drugiego rodzica. */
const parentalMax = (a: Answers, other: string) =>
  Math.max(parentalPool(a) - Math.max(PARAMS.PARENTAL_NONTRANSFERABLE_WEEKS, Number(other || 0)), 0);
const clampWeeks = (v: string, max: number) => (v === "" ? v : String(Math.min(Number(v), max)));
/** FE1-44: ile tygodni rodzicielskiego zostało tacie po porodzie (jak `remaining.fatherWeeks` w podglądzie). */
const fatherLeftWeeks = (a: Answers) => {
  const usedM = Number(a.usedParentalMotherWeeks || 0);
  const usedF = Number(a.usedParentalFatherWeeks || 0);
  const total = Math.max(parentalPool(a) - usedM - usedF, 0);
  return Math.max(Math.min(parentalPool(a) - PARAMS.PARENTAL_NONTRANSFERABLE_WEEKS - usedF, total), 0);
};

export type StepProps = { a: Answers; set: (patch: Partial<Answers>) => void };
export type Step = {
  id: string;
  title: string;
  visible: (a: Answers) => boolean;
  complete: (a: Answers) => boolean;
  /** Krótka historia wyboru pokazywana pod nazwą kroku na liście kroków (null = nic do pokazania). */
  summary: (a: Answers) => string | null;
  render: (p: StepProps) => React.ReactNode;
};

const TRI_TEXT = { YES: "tak", NO: "nie", UNKNOWN: "nie wiem" } as const;
/** FE1-24: rodzaj umowy w podsumowaniu kroku. */
const CONTRACT_TEXT: Record<Exclude<Answers["contractType"], null | "INDEFINITE">, string> = {
  FIXED_TERM: "na czas określony",
  PROBATION_OVER_1_MONTH: "próbna > 1 mies.",
  PROBATION_UP_TO_1_MONTH: "próbna do 1 mies.",
  REPLACEMENT: "na zastępstwo",
};
const TITLE_TEXT = { EMPLOYMENT: "Umowa o pracę", MANDATE: "Umowa zlecenia", SELF_EMPLOYED: "Działalność (JDG)", NONE: "Bez ubezpieczenia / nie wiem" } as const;
const GUARDIAN_TEXT = { ADOPTION: "Adopcja", FOSTER_NON_PROFESSIONAL: "Rodzina zastępcza niezawodowa", FOSTER_PROFESSIONAL: "Zawodowa rodzina zastępcza" } as const;
const plWeeks = (n: number) => `${n} tyg.`;
/** FE1-07: limit tygodni urlopu uzupełniającego z PARAMS (KP art. 180(2)); `known` = tydzień ciąży i masa rozstrzygają wariant. */
const suppCapWeeks = (a: Answers): { cap: number; known: boolean } => {
  const gw = a.gestationWeeks === "" ? null : Number(a.gestationWeeks);
  // FE1-05: masa jako odpowiedź względem progu (≤ SUPP_WEIGHT_THRESHOLD_G), nie dokładna waga
  const lowWeight = a.lowBirthWeight === "YES" ? true : a.lowBirthWeight === "NO" ? false : null;
  const early = (gw !== null && gw < PARAMS.SUPP_GESTATION_EARLY_WEEK) || lowWeight === true;
  if (early) return { cap: PARAMS.SUPP_CAP_WEEK_EARLY, known: true };
  if (gw !== null && lowWeight !== null) return { cap: PARAMS.SUPP_CAP_WEEK_PRETERM, known: true };
  return { cap: PARAMS.SUPP_CAP_WEEK_EARLY, known: false };
};
const plDays = (n: number) => `${n} ${n === 1 ? "dzień" : "dni"}`;
/** FE1-08: dni pobytu → tygodnie; niepełny tydzień liczy się jako pełny (07 §5 `f_supplementary_leave_weeks`). Puste/niepoprawne = "" (UNKNOWN). */
export const daysToHospitalWeeks = (days: string): string => {
  if (!/^\d+$/.test(days.trim())) return "";
  return String(Math.ceil(Number(days.trim()) / PARAMS.WEEK_AS_DAYS));
};
/** FE1-08: przykład przeliczenia w podpowiedzi (5 pełnych tygodni + 3 dni → 6 tyg., poniżej obu limitów). */
const HOSPITAL_EXAMPLE = (() => {
  const days = 5 * PARAMS.WEEK_AS_DAYS + 3;
  return `Przykład: ${plDays(days)} = ${plWeeks(5)} + ${plDays(3)} → ${plWeeks(Number(daysToHospitalWeeks(String(days))))} (niepełny tydzień liczy się jako pełny).`;
})();
/** FE1-08: pole „dni w szpitalu” z podglądem przeliczenia na tygodnie i limitu urlopu. */
function HospitalDays({ a, set, cap, label, hint }: StepProps & { cap: number; label: string; hint: string }) {
  const weeks = a.hospitalWeeks === "" ? null : Number(a.hospitalWeeks);
  const days = weeks === null ? 0 : Number(a.hospitalDays);
  const full = Math.floor(days / PARAMS.WEEK_AS_DAYS);
  const rest = days % PARAMS.WEEK_AS_DAYS;
  const invalid = a.hospitalDays.trim() !== "" && weeks === null;
  const resultId = useId();
  return (
    <div className="space-y-2">
      <Field label={label} hint={hint}>
        {/* type="text" (nie "number"): przeglądarka nie zamienia wtedy nieparsowalnego wpisu na "", więc walidacja widzi surową wartość */}
        <input type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" className={inputCls} value={a.hospitalDays}
          aria-invalid={invalid || undefined} aria-describedby={resultId} placeholder="np. 38"
          onChange={(e) => set({ hospitalDays: e.target.value, hospitalWeeks: daysToHospitalWeeks(e.target.value) })} />
      </Field>
      <p id={resultId} aria-live="polite" className={`text-sm ${invalid ? "text-red-700" : "text-zinc-700"}`}>
        {invalid ? "Podaj liczbę całkowitą dni (0 lub więcej)."
          : weeks === null ? null
          : <>
              {plDays(days)} = <strong>{plWeeks(weeks)}</strong>
              {rest > 0 && ` (${full > 0 ? `${plWeeks(full)} + ` : ""}${plDays(rest)} - niepełny tydzień liczymy jako pełny)`}
              {weeks > cap && `. Do urlopu uzupełniającego liczy się najwyżej ${plWeeks(cap)}`}
            </>}
      </p>
    </div>
  );
}
/** Pełne tygodnie od porodu do dziś (null, gdy brak daty). */
export const weeksSinceBirth = (a: Answers): number | null =>
  a.eventDate ? Math.floor(daysBetween(a.eventDate, todayIso()) / PARAMS.WEEK_AS_DAYS) : null;
/** FE1-09: spójność kroku „Co już wykorzystano” - komunikaty przy polach (pusta lista = można przejść dalej). */
export const usedErrors = (a: Answers): { maternity?: string; parental?: string; parts?: string } => {
  const m = Number(a.usedParentalMotherWeeks || 0);
  const f = Number(a.usedParentalFatherWeeks || 0);
  const pool = parentalPool(a);
  const since = weeksSinceBirth(a);
  const out: { maternity?: string; parental?: string; parts?: string } = {};
  // macierzyński biegnie bez przerw od porodu - nie da się wykorzystać więcej tygodni, niż minęło
  if (a.usedMaternityFully === "NO" && a.usedMaternityWeeks !== "" && since !== null && Number(a.usedMaternityWeeks) > since + 1) {
    out.maternity = `Od porodu minęło ${since} tyg., więc nie można było wykorzystać ${a.usedMaternityWeeks} tyg. urlopu macierzyńskiego.`;
  } else if (a.usedMaternityFully === "NO" && m + f > 0) {
    out.maternity = "Urlop rodzicielski zaczyna się dopiero po całym urlopie macierzyńskim (lub po jego przejęciu przez tatę). Zaznacz „Tak” albo ustaw wykorzystany rodzicielski na 0.";
  }
  if (m + f > pool) out.parental = `Razem wykorzystano ${m + f} tyg. rodzicielskiego, a cała pula to ${pool} tyg. Popraw liczby tygodni mamy i taty.`;
  if (m + f > 0 && Number(a.usedParts || 0) === 0) out.parts = "Wykorzystano już tygodnie rodzicielskiego - podaj, na ile części (wniosków) go podzielono (co najmniej 1).";
  else if (Number(a.usedParts || 0) > m + f && m + f > 0) out.parts = `Części nie może być więcej niż tygodni (${m + f}) - każda część to co najmniej tydzień.`;
  return out;
};
const FieldError = ({ id, text }: { id: string; text?: string }) => text
  ? <p id={id} role="alert" className="mt-1 text-sm text-zus-red">{text}</p> : null;
const join = (parts: (string | null | false | undefined)[]) => parts.filter(Boolean).join(" · ") || null;

const isBirth = (a: Answers) => a.role !== "GUARDIAN";
const isWorker = (a: Answers) => a.title === "EMPLOYMENT" || a.title === "MANDATE";

export const STEPS: Step[] = [
  {
    id: "role",
    title: "Kim jesteś?",
    visible: (a) => !a.sensitive,
    complete: (a) => a.role !== null,
    summary: (a) => (a.role === "MOTHER" ? "Jestem mamą" : a.role === "FATHER" ? "Jestem tatą" : a.role === "GUARDIAN" ? "Przyjmuję dziecko jako opiekun" : null),
    render: ({ a, set }) => (
      <Choice legend="Kim jesteś?" value={a.role} columns={3} onChange={(role) => set({ role })} options={[
        { value: "MOTHER", label: "Mamą", description: "jestem w ciąży lub urodziłam" },
        { value: "FATHER", label: "Tatą", description: "partnerka jest w ciąży lub urodziła" },
        { value: "GUARDIAN", label: "Opiekunem", description: "adopcja lub rodzina zastępcza" },
      ]} />
    ),
  },
  {
    id: "stage",
    title: "Etap",
    visible: (a) => a.role !== null && !a.sensitive,
    complete: (a) => (a.role === "GUARDIAN" ? a.guardianKind !== null : a.stage !== null),
    summary: (a) => (a.role === "GUARDIAN" ? (a.guardianKind ? GUARDIAN_TEXT[a.guardianKind] : null)
      : a.stage === "PREGNANT" ? (a.role === "FATHER" ? "Partnerka jest w ciąży" : "Jestem w ciąży") : a.stage === "BORN" ? "Dziecko już jest na świecie" : null),
    render: ({ a, set }) =>
      a.role === "GUARDIAN" ? (
        <Choice legend="Jaka to forma przyjęcia dziecka?" value={a.guardianKind} columns={1} onChange={(guardianKind) => set({ guardianKind })} options={[
          { value: "ADOPTION", label: "Adopcja", description: "wystąpiłam(-em) do sądu o przysposobienie" },
          { value: "FOSTER_NON_PROFESSIONAL", label: "Rodzina zastępcza niezawodowa" },
          { value: "FOSTER_PROFESSIONAL", label: "Zawodowa rodzina zastępcza" },
        ]} />
      ) : (
        <Choice legend="Na jakim etapie jesteś?" value={a.stage} onChange={(stage) => set({ stage })} options={[
          { value: "PREGNANT", label: a.role === "FATHER" ? "Partnerka jest w ciąży" : "Jestem w ciąży", description: "planuję urlopy i wnioski" },
          { value: "BORN", label: "Dziecko już się urodziło", description: "sprawdzę, co zostało i do kiedy" },
        ]} />
      ),
  },
  {
    id: "event",
    title: "Data i dzieci",
    visible: (a) => a.role !== null,
    complete: (a) => !!a.eventDate && !hasErrors(a, "eventDate") && a.children >= 1 && (a.role !== "GUARDIAN" || a.childAgeYears !== ""),
    summary: (a) => join([
      a.eventDate && `${a.role === "GUARDIAN" ? "Przyjęcie dziecka" : a.stage === "BORN" ? "Poród" : "Poród planowany"} ${formatDate(a.eventDate)}`,
      a.children > 1 && `${a.children} dzieci`,
      a.role === "GUARDIAN" && a.childAgeYears !== "" && `wiek ${plYears(Number(a.childAgeYears))}`]),
    render: ({ a, set }) => (
      <div className="space-y-4">
        <DateField label={a.role === "GUARDIAN" ? "Data przyjęcia dziecka" : a.stage === "BORN" ? "Data porodu" : "Planowana data porodu"}
          hint={a.stage === "PREGNANT" ? "Z karty ciąży; wynik będzie prognozą." : undefined}
          value={a.eventDate} error={dateErrors(a).eventDate} onChange={(eventDate) => set({ eventDate })} />
        {/* FE1-41: świadczenia w ciąży (wymaganie a) - L4 w ciąży ocenia silnik reguł (PREGNANCY_INCAPACITY) */}
        {a.role === "MOTHER" && a.stage === "PREGNANT" && (
          <>
            <DateField label="Twoja data urodzenia (jeśli chcesz dokładny wynik zwolnienia lekarskiego)"
              hint={`Od roku następującego po roku, w którym kończysz ${PARAMS.SICK_PAY_AGE_THRESHOLD} lat, pracodawca płaci za ${PARAMS.SICK_PAY_DAYS_50PLUS} zamiast ${PARAMS.SICK_PAY_DAYS_STD} dni zwolnienia w roku.`}
              value={a.birthDate} onChange={(birthDate) => set({ birthDate })} />
            <Choice legend="Czy jesteś teraz (albo byłaś) na zwolnieniu lekarskim w ciąży (L4)?" value={a.sickLeave} columns={3}
              onChange={(sickLeave) => set({ sickLeave })} options={TRI_OPTIONS} />
            {a.sickLeave === "YES" && (
              <>
                <DateField label="Zwolnienie od" value={a.sickLeaveFrom} onChange={(sickLeaveFrom) => set({ sickLeaveFrom })} />
                <DateField label="Zwolnienie do (jeśli znasz)" value={a.sickLeaveTo} onChange={(sickLeaveTo) => set({ sickLeaveTo })} />
                <Choice legend="Czy w tym roku byłaś już wcześniej na zwolnieniu lekarskim?" value={a.sickLeaveEarlier} columns={3}
                  onChange={(sickLeaveEarlier) => set({ sickLeaveEarlier })} options={TRI_OPTIONS} />
              </>
            )}
          </>
        )}
        <Field label={a.role === "GUARDIAN" ? "Ile dzieci przyjmujesz jednocześnie?" : "Ile dzieci przy jednym porodzie?"}>
          <select className={inputCls} value={a.children} onChange={(e) => set({ children: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 5 ? "5 lub więcej" : n}</option>)}
          </select>
        </Field>
        {a.role === "GUARDIAN" && (
          <>
            <NumberSelect label="Wiek dziecka" value={a.childAgeYears} from={0} to={17} unit={plYears} unknownLabel="Wybierz wiek"
              onChange={(childAgeYears) => set({ childAgeYears })} />
            <DateField label="Data urodzenia dziecka (jeśli znasz)"
              hint={`Policzymy dokładny koniec urlopu - najpóźniej dzień przed ${a.guardianKind === "ADOPTION" ? PARAMS.ADOPTION_CHILD_AGE_MAX
                : a.schoolDeferred === "YES" ? PARAMS.FOSTER_CHILD_AGE_MAX_SCHOOL_DEFERRED : PARAMS.FOSTER_CHILD_AGE_MAX}. urodzinami dziecka.`}
              value={a.childBirthDate} onChange={(childBirthDate) => set(childBirthDate && a.eventDate
                ? { childBirthDate, childAgeYears: String(fullYears(childBirthDate, a.eventDate)) } : { childBirthDate })} />
            {a.guardianKind === "ADOPTION" && (
              <DateField label="Kiedy złożono wniosek do sądu o przysposobienie?"
                hint="Zasiłek przysługuje po przyjęciu dziecka i złożeniu wniosku do sądu - bez tej daty wynik będzie wymagał uzupełnienia."
                value={a.courtApplicationDate} onChange={(courtApplicationDate) => set({ courtApplicationDate })} />
            )}
            {a.guardianKind === "ADOPTION" && (
              <DateField label="Data uprawomocnienia postanowienia o przysposobieniu (jeśli znasz)"
                hint={`Od tej daty liczy się ${PARAMS.PATERNITY_ADOPTION_WINDOW_MONTHS} miesięcy na urlop ojcowski.`}
                value={a.adoptionFinalDate} onChange={(adoptionFinalDate) => set({ adoptionFinalDate })} />
            )}
            {a.guardianKind !== "ADOPTION" && (
              <Choice legend="Czy dziecku odroczono obowiązek szkolny?" value={a.schoolDeferred} columns={3}
                onChange={(schoolDeferred) => set({ schoolDeferred })} options={TRI_OPTIONS} />
            )}
          </>
        )}
      </div>
    ),
  },
  {
    id: "loss",
    title: "Strata dziecka",
    visible: (a) => a.sensitive && isBirth(a),
    complete: (a) => a.lossKind === "STILLBORN" || (!!a.deathDate && !hasErrors(a, "deathDate")),
    summary: (a) => (a.lossKind === "STILLBORN" ? "Martwe urodzenie" : join(["Zgon po porodzie", a.deathDate && formatDate(a.deathDate)])),
    render: ({ a, set }) => (
      <div className="space-y-4">
        <p className="text-sm text-zinc-700">Bardzo nam przykro. Zapytamy tylko o to, co niezbędne.</p>
        <Choice legend="Co się wydarzyło?" value={a.lossKind} columns={2} onChange={(lossKind) => set({ lossKind, stillborn: true })} options={[
          { value: "STILLBORN", label: "Dziecko urodziło się martwe" },
          { value: "DIED", label: "Dziecko zmarło po porodzie" },
        ]} />
        {a.lossKind === "DIED" && (
          <DateField label="Data śmierci dziecka" value={a.deathDate} error={dateErrors(a).deathDate}
            onChange={(deathDate) => set({ deathDate })} />
        )}
        {a.stillborn && a.children > 1 && (
          <Choice legend="Czy któreś z dzieci żyje?" value={a.allStillborn ? "NO" : "YES"} columns={2}
            onChange={(v) => set({ allStillborn: v === "NO" })} options={[{ value: "YES", label: "Tak" }, { value: "NO", label: "Nie" }]} />
        )}
      </div>
    ),
  },
  {
    id: "special",
    title: "Okoliczności szczególne",
    visible: (a) => isBirth(a) && !a.sensitive && a.role !== null,
    complete: (a) => !a.preterm || (a.gestationWeeks !== "" || a.lowBirthWeight !== "UNKNOWN"),
    summary: (a) => join([
      a.preterm && "Wcześniak / szpital",
      a.preterm && a.gestationWeeks !== "" && `${a.gestationWeeks}. tydz.`,
      a.preterm && weightMatters(a) && a.lowBirthWeight !== "UNKNOWN" && `${a.lowBirthWeight === "YES" ? "do" : "powyżej"} ${weightLimit()}`,
      a.preterm && a.hospitalWeeks !== "" && `szpital ${plDays(Number(a.hospitalDays))} = ${plWeeks(Number(a.hospitalWeeks))}`,
      a.zaZyciem && "„Za życiem”",
    ]) ?? "Brak",
    render: ({ a, set }) => (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600">Zaznacz, jeśli dotyczy. Jeśli dziecko jeszcze się nie urodziło, możesz wrócić do tego kroku później.</p>
        <Check label="Wcześniak lub pobyt dziecka w szpitalu" hint="Może przysługiwać urlop uzupełniający (do 8 lub 15 tygodni)."
          checked={a.preterm} onChange={(preterm) => set({ preterm })} />
        {a.preterm && (
          <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-2">
            <NumberSelect label="Ukończony tydzień ciąży przy porodzie" value={a.gestationWeeks} from={20} to={42}
              unit={(n) => `${n}. tydzień`} onChange={(gestationWeeks) => set({ gestationWeeks })} />
            {weightMatters(a) && (
              <div className="sm:col-span-2">
                <Choice legend="Masa urodzeniowa" hint="Przy kilkorgu dzieci: najlżejszego. Dokładna waga nie jest potrzebna."
                  value={a.lowBirthWeight} columns={3} onChange={(lowBirthWeight) => set({ lowBirthWeight })} options={weightOptions()} />
              </div>
            )}
            <div className="space-y-2 sm:col-span-2">
              {a.children > 1 && (
                <p role="note" className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                  Masz {a.children} dzieci z tego porodu: podaj czas pobytu w szpitalu tego dziecka, które było w szpitalu
                  najdłużej. To ono wyznacza długość urlopu uzupełniającego (KP art. 180<sup>2</sup> § 2).
                </p>
              )}
              {(() => {
                const { cap, known } = suppCapWeeks(a);
                const capHint = `Urlop uzupełniający wynosi najwyżej ${cap} tyg. - dłuższy pobyt go nie wydłuża.${known ? "" : ` Limit ${PARAMS.SUPP_CAP_WEEK_EARLY} tyg. dotyczy porodu przed ${PARAMS.SUPP_GESTATION_EARLY_WEEK}. tygodniem ciąży lub masy do ${PARAMS.SUPP_WEIGHT_THRESHOLD_G} g; w pozostałych przypadkach ${PARAMS.SUPP_CAP_WEEK_PRETERM} tyg.`}`;
                const who = a.children > 1 ? " (dziecko najdłużej w szpitalu)" : "";
                return (
                  <HospitalDays a={a} set={set} cap={cap} label={`Łącznie dni w szpitalu${who}`}
                    hint={`Liczba dni z zaświadczenia ze szpitala - przeliczymy ją na tygodnie. ${HOSPITAL_EXAMPLE} Kilka pobytów sumuje się; liczą się dni od porodu, w czasie urlopu macierzyńskiego. Puste pole = nie wiem. ${capHint}`} />
                );
              })()}
            </div>
            {Number(a.gestationWeeks) >= 37 && (
              <Choice legend="Czy pobyt w szpitalu (≥ 2 dni) zaczął się między 5. a 28. dniem życia?" value={a.lateHospitalQualifies}
                columns={3} onChange={(lateHospitalQualifies) => set({ lateHospitalQualifies })} options={TRI_OPTIONS} />
            )}
          </div>
        )}
        <Check label="Zaświadczenie „Za życiem”" hint="Ciężkie i nieodwracalne upośledzenie lub nieuleczalna choroba - dłuższy urlop rodzicielski."
          checked={a.zaZyciem} onChange={(zaZyciem) => set({ zaZyciem })} />
      </div>
    ),
  },
  {
    id: "insurance",
    title: "Praca i ubezpieczenie",
    visible: (a) => a.role !== null,
    complete: (a) => a.title !== null && (a.title === "NONE" || !!noInsuranceReason(a) || !!a.insuredFrom) && !hasErrors(a, "contractEnd")
      && (a.title !== "EMPLOYMENT" || a.contractType !== null),
    summary: (a) => (a.title ? join([TITLE_TEXT[a.title], a.title !== "NONE" && a.insuredFrom && `od ${formatDate(a.insuredFrom)}`,
      a.contractType && a.contractType !== "INDEFINITE" && CONTRACT_TEXT[a.contractType], a.title === "EMPLOYMENT" && a.fullTime === "NO" && "niepełny etat",
      noInsuranceReason(a) === "START_RELIEF" && "ulga na start", noInsuranceReason(a) === "STUDENT_UNDER_26" && "student do 26 lat"]) : null),
    render: ({ a, set }) => (
      <div className="space-y-4">
        <Choice legend="Z jakiego tytułu masz ubezpieczenie?" value={a.title} onChange={(title) => set({ title })} options={[
          { value: "EMPLOYMENT", label: "Umowa o pracę" },
          { value: "MANDATE", label: "Umowa zlecenia" },
          { value: "SELF_EMPLOYED", label: "Działalność gospodarcza (JDG)" },
          { value: "NONE", label: "Nie pracuję / nie wiem", description: "sprawdzimy inne możliwości" },
        ]} />
        {a.title === "SELF_EMPLOYED" && (
          <Choice legend="Czy korzystasz z ulgi na start?" value={a.startRelief} columns={3}
            hint={`Pierwsze ${PARAMS.START_RELIEF_MONTHS} miesięcy działalności bez składek na ubezpieczenia społeczne - w tym czasie nie ma też chorobowego.`}
            onChange={(startRelief) => set({ startRelief })} options={TRI_OPTIONS} />
        )}
        {a.title === "MANDATE" && (
          <Choice legend={`Czy jesteś uczniem lub studentem i nie masz jeszcze ${PARAMS.STUDENT_AGE_LIMIT_YEARS} lat?`} value={a.studentUnder26} columns={3}
            hint={`Uczeń lub student przed ${PARAMS.STUDENT_AGE_LIMIT_YEARS}. urodzinami na umowie zlecenia nie podlega ubezpieczeniom społecznym, także chorobowemu.`}
            onChange={(studentUnder26) => set({ studentUnder26 })} options={TRI_OPTIONS} />
        )}
        {(a.title === "MANDATE" || a.title === "SELF_EMPLOYED") && !noInsuranceReason(a) && (
          <Choice legend="Czy opłacasz dobrowolne ubezpieczenie chorobowe?" hint="Bez niego nie ma zasiłku macierzyńskiego z tego tytułu."
            value={a.voluntarySickness} columns={3} onChange={(voluntarySickness) => set({ voluntarySickness })} options={TRI_OPTIONS} />
        )}
        {a.title && a.title !== "NONE" && !noInsuranceReason(a) && (
          <>
            <ZusFetch source="insurance" a={a} set={set} what="Nie pamiętasz dat? Pobierzemy okres ubezpieczenia i dane płatnika." />
            <DateField label="Od kiedy podlegasz ubezpieczeniu chorobowemu?" hint="Wpisz ręcznie albo pobierz powyżej."
              value={a.insuredFrom} warning={dateWarnings(a).insuredFrom} onChange={(insuredFrom) => set({ insuredFrom })} />
          </>
        )}
        {a.title === "EMPLOYMENT" && (
          <>
            <Choice legend="Rodzaj umowy" value={a.contractType} onChange={(contractType) => set({ contractType })} options={[
              { value: "INDEFINITE", label: "Na czas nieokreślony" },
              { value: "FIXED_TERM", label: "Na czas określony" },
              { value: "PROBATION_OVER_1_MONTH", label: "Na okres próbny dłuższy niż 1 miesiąc" },
              { value: "PROBATION_UP_TO_1_MONTH", label: "Na okres próbny do 1 miesiąca" },
              { value: "REPLACEMENT", label: "Na zastępstwo" },
            ]} />
            <Choice legend="Czy pracujesz na pełny etat?" value={a.fullTime} columns={3}
              hint="Przy pełnym etacie podstawa zasiłku nie może być niższa niż minimalna (płaca minimalna po odliczeniu 13,71%)."
              onChange={(fullTime) => set({ fullTime })} options={TRI_OPTIONS} />
            {hasContractEnd(a.contractType) && (
              <DateField label="Do kiedy trwa umowa?" value={a.contractEnd} error={dateErrors(a).contractEnd}
                onChange={(contractEnd) => set({ contractEnd })} />
            )}
            {hasContractEnd(a.contractType) && !extendableUntilBirth(a.contractType) && a.contractEnd && a.eventDate && a.contractEnd < a.eventDate && (
              <p role="note" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {a.contractType === "REPLACEMENT" ? "Umowa na zastępstwo" : "Umowa na okres próbny do 1 miesiąca"} nie przedłuża się do dnia porodu
                (KP art. 177 § 3) - jeśli skończy się przed porodem, bez innego ubezpieczenia nie będzie zasiłku macierzyńskiego.
              </p>
            )}
            {extendableUntilBirth(a.contractType) && a.contractEnd && a.eventDate && a.contractEnd < a.eventDate && (
              <Choice legend="Czy umowa kończy się po upływie 3. miesiąca ciąży?" value={a.contractEndsAfter3rdMonth} columns={3}
                onChange={(contractEndsAfter3rdMonth) => set({ contractEndsAfter3rdMonth })} options={TRI_OPTIONS} />
            )}
            <Choice legend="Czy umowa ustała lub ustanie przed porodem z innego powodu?" value={a.employerEnded} onChange={(employerEnded) => set({ employerEnded })} options={[
              { value: "NO", label: "Nie" },
              { value: "LIQUIDATION", label: "Likwidacja pracodawcy" },
              { value: "BANKRUPTCY", label: "Upadłość pracodawcy" },
              { value: "OWN_NOTICE", label: "Sama(-m) rozwiązuję umowę" },
            ]} />
          </>
        )}
        {isWorker(a) && (
          <Choice legend="Ile osób zgłasza do ubezpieczenia chorobowego Twój pracodawca/zleceniodawca?" hint="Od tego zależy, kto wypłaca zasiłek: płatnik (> 20 osób) czy ZUS."
            value={a.payerSize} columns={3} onChange={(payerSize) => set({ payerSize })} options={[
              { value: "GT20", label: "Więcej niż 20" }, { value: "LE20", label: "20 lub mniej" }, { value: "UNKNOWN", label: "Nie wiem" },
            ]} />
        )}
        {a.title === "SELF_EMPLOYED" && !noInsuranceReason(a) && (
          <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <ZusFetch source="debt" a={a} set={set} what="Pobierz zaświadczenie o stanie rozliczeń składek." />
            <Field label="Zaległość w składkach na dzień porodu (zł)" hint="0, jeśli brak.">
              <input inputMode="decimal" className={inputCls} value={a.debt} onChange={(e) => set({ debt: e.target.value })} />
            </Field>
            <Choice legend="Czy działalność lub dobrowolne chorobowe zaczęło się w trakcie ciąży?" value={a.startedDuringPregnancy} columns={3}
              onChange={(startedDuringPregnancy) => set({ startedDuringPregnancy })} options={TRI_OPTIONS} />
            <Choice legend="Czy w ciąży podwyższono podstawę składek?" value={a.raisedBaseDuringPregnancy} columns={3}
              onChange={(raisedBaseDuringPregnancy) => set({ raisedBaseDuringPregnancy })} options={TRI_OPTIONS} />
          </div>
        )}
      </div>
    ),
  },
  {
    id: "used",
    title: "Co już wykorzystano",
    // FE1-44: także dla taty - po porodzie planuje swoją część rodzicielskiego i ojcowski
    visible: (a) => a.stage === "BORN" && (a.role === "MOTHER" || a.role === "FATHER") && !a.sensitive,
    complete: (a) => Object.keys(usedErrors(a)).length === 0,
    summary: (a) => join([a.usedMaternityFully === "NO" && a.usedMaternityWeeks !== "" && `macierzyński ${plWeeks(Number(a.usedMaternityWeeks))}`,
      `mama ${plWeeks(Number(a.usedParentalMotherWeeks || 0))}`, `tata ${plWeeks(Number(a.usedParentalFatherWeeks || 0))}`,
      Number(a.usedParts) > 0 && `${a.usedParts} cz.`]),
    render: ({ a, set }) => (
      <div className="space-y-4">
        <ZusFetch source="usedLeave" a={a} set={set} what="Pobierz wykorzystane już urlopy i wypłacone zasiłki." />
        <Choice legend="Czy urlop macierzyński został wykorzystany w całości?" value={a.usedMaternityFully} columns={3}
          onChange={(usedMaternityFully) => set(usedMaternityFully === "YES" ? { usedMaternityFully }
            : { usedMaternityFully, usedParentalMotherWeeks: "0", usedParentalFatherWeeks: "0", usedParts: "0" })} options={TRI_OPTIONS} />
        {a.usedMaternityFully === "NO" && (
          <Slider label="Macierzyński wykorzystany" unit="tyg." min={0} max={maternityWeeks(a.children) - 1}
            value={a.usedMaternityWeeks} emptyLabel="nie wiem"
            describedBy={usedErrors(a).maternity ? "used-maternity-err" : undefined}
            hint={`Pełny wymiar: ${maternityWeeks(a.children)} tyg. (wtedy wybierz „Tak”). Policzymy, ile zostało i do kiedy.`}
            onChange={(v) => set({ usedMaternityWeeks: clampWeeks(v, maternityWeeks(a.children) - 1) })} />
        )}
        <FieldError id="used-maternity-err" text={usedErrors(a).maternity} />
        {a.usedMaternityFully === "NO" && a.usedMaternityWeeks !== "" && !usedErrors(a).maternity
          && (weeksSinceBirth(a) ?? 0) > Number(a.usedMaternityWeeks) && Number(a.usedMaternityWeeks) < PARAMS.MOTHER_MIN_WEEKS_BEFORE_TRANSFER && (
          <p role="note" className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
            Urlop macierzyński przerwany przed upływem {PARAMS.MOTHER_MIN_WEEKS_BEFORE_TRANSFER} tyg. to sytuacja szczególna
            (np. pobyt w szpitalu, orzeczenie o niezdolności do samodzielnej egzystencji) - wynik pokażemy, ale sprawdź ją w ZUS.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Slider label="Rodzicielski wykorzystany przez mamę" unit="tyg." min={0} max={parentalMax(a, a.usedParentalFatherWeeks)}
            value={a.usedParentalMotherWeeks} disabled={a.usedMaternityFully !== "YES"}
            describedBy={[usedErrors(a).parental && "used-parental-err", usedErrors(a).maternity && "used-maternity-err"].filter(Boolean).join(" ") || undefined}
            emptyLabel="0 tyg." onChange={(v) => set({ usedParentalMotherWeeks: clampWeeks(v, parentalMax(a, a.usedParentalFatherWeeks)) })} />
          <Slider label="Rodzicielski wykorzystany przez tatę" unit="tyg." min={0} max={parentalMax(a, a.usedParentalMotherWeeks)}
            value={a.usedParentalFatherWeeks} disabled={a.usedMaternityFully !== "YES"}
            describedBy={[usedErrors(a).parental && "used-parental-err", usedErrors(a).maternity && "used-maternity-err"].filter(Boolean).join(" ") || undefined}
            emptyLabel="0 tyg." onChange={(v) => set({ usedParentalFatherWeeks: clampWeeks(v, parentalMax(a, a.usedParentalMotherWeeks)) })} />
        </div>
        {a.usedMaternityFully !== "YES" ? (
          <p className="text-sm text-zinc-600">Urlop rodzicielski jest dostępny po wykorzystaniu całego urlopu macierzyńskiego - dlatego suwaki są nieaktywne.</p>
        ) : (
          <p className="text-sm text-zinc-600">Pula rodzicielskiego: {parentalPool(a)} tyg., z czego po {PARAMS.PARENTAL_NONTRANSFERABLE_WEEKS} tyg. jest tylko dla mamy i tylko dla taty - suwaki nie pozwalają ich przekroczyć.</p>
        )}
        <FieldError id="used-parental-err" text={usedErrors(a).parental} />
        <NumberSelect label="Na ile części (wniosków) podzielono rodzicielski?" hint="Każdy wniosek to osobna część." value={a.usedParts}
          from={0} to={PARAMS.PARENTAL_MAX_PARTS} unknownLabel={null} unit={(n) => (n === 0 ? "Jeszcze nie korzystaliśmy" : `${n}`)}
          describedBy={usedErrors(a).parts ? "used-parts-err" : undefined}
          onChange={(usedParts) => set({ usedParts })} />
        <FieldError id="used-parts-err" text={usedErrors(a).parts} />
        <Choice legend="Jaki wariant wypłaty wybrano?" value={a.usedVariant} columns={3} onChange={(usedVariant) => set({ usedVariant })} options={[
          { value: "COMBINED_815", label: "81,5% przez cały okres" },
          { value: "FULL_100_70", label: "100%, potem 70%" },
          { value: "UNKNOWN", label: "Nie wiem", description: "pobierz dane z ZUS powyżej (symulacja)" },
        ]} />
        {/* FE1-44: plan części taty po porodzie - rodzicielski (do końca roku 6. urodzin) i ojcowski (do 12. miesiąca) */}
        <Slider label="Ile tygodni rodzicielskiego weźmie jeszcze tata?" unit="tyg." min={0} max={fatherLeftWeeks(a)}
          value={a.fatherRemainingWeeks} emptyLabel="0 tyg." disabled={a.usedMaternityFully !== "YES"}
          hint={`Tacie zostało do ${fatherLeftWeeks(a)} tyg. (w tym ${Math.max(PARAMS.PARENTAL_NONTRANSFERABLE_WEEKS - Number(a.usedParentalFatherWeeks || 0), 0)} tyg. tylko dla niego). Zaplanujemy je po dalszej części mamy.`}
          onChange={(v) => set({ fatherRemainingWeeks: clampWeeks(v, fatherLeftWeeks(a)) })} />
        <Choice legend="Czy tata wykorzystał już urlop ojcowski?" value={a.fatherPaternityUsed} columns={3}
          hint={`${PARAMS.PATERNITY_WEEKS} tygodnie, do ukończenia przez dziecko ${PARAMS.PATERNITY_CHILD_AGE_MONTHS} miesięcy.`}
          onChange={(fatherPaternityUsed) => set({ fatherPaternityUsed })} options={TRI_OPTIONS} />
      </div>
    ),
  },
  {
    id: "partner",
    title: "Partnerka",
    visible: (a) => a.role === "FATHER",
    complete: () => true,
    summary: (a) => join([`Ubezpieczona: ${TRI_TEXT[a.partnerInsured]}`, a.fatherTakesOverMaternity && "przejmuję część macierzyńskiego"]),
    render: ({ a, set }) => (
      <div className="space-y-4">
        <ZusFetch source="partner" a={a} set={set} what="Za zgodą partnerki: sprawdź jej status ubezpieczenia chorobowego." />
        <Choice legend="Czy partnerka ma ubezpieczenie chorobowe?" hint="Od tego zależy, z jakich urlopów możesz skorzystać." value={a.partnerInsured}
          columns={3} onChange={(partnerInsured) => set({ partnerInsured })} options={TRI_OPTIONS} />
        {a.partnerInsured === "YES" && a.stage === "PREGNANT" && (
          <Check label="Przejmę część urlopu macierzyńskiego" hint="Mama wykorzystuje co najmniej 14 tygodni po porodzie, resztę możesz przejąć Ty."
            checked={a.fatherTakesOverMaternity} onChange={(fatherTakesOverMaternity) => set({ fatherTakesOverMaternity })} />
        )}
      </div>
    ),
  },
  {
    id: "plans",
    title: "Plany",
    visible: (a) => a.role !== null && a.stage !== "BORN" && !a.sensitive,
    complete: (a) => !hasErrors(a, "maternityStart"),
    summary: (a) => {
      const wb = weeksBefore(a);
      return join([
        a.role === "MOTHER" && (wb === "0" ? "start w dniu porodu" : wb === "custom" ? `start ${formatDate(a.maternityStart)}` : `start ${wb} tyg. przed porodem`),
        (a.role !== "FATHER" || a.partnerInsured !== "NO") && `tata ${plWeeks(a.fatherParentalWeeks)} rodzicielskiego`,
        a.role === "MOTHER" && a.workFraction !== "0" && `praca ${a.workFraction === "0.25" ? "¼" : "½"} etatu`,
      ]);
    },
    render: ({ a, set }) => (
      <div className="space-y-5">
        {a.role === "MOTHER" && (
          <div className="space-y-3">
            <Field label="Kiedy chcesz zacząć urlop macierzyński?" hint={`Najwcześniej ${PARAMS.PRE_BIRTH_MAX_WEEKS} tygodni przed porodem. Tygodnie przed porodem odejmą się od urlopu po porodzie.`}>
              <select className={inputCls} value={weeksBefore(a)} disabled={!a.eventDate}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "custom") set({ maternityStart: a.maternityStart || a.eventDate });
                  else set({ maternityStart: v === "0" ? "" : addDays(a.eventDate, -Number(v) * PARAMS.WEEK_AS_DAYS) });
                }}>
                <option value="0">W dniu porodu</option>
                {Array.from({ length: PARAMS.PRE_BIRTH_MAX_WEEKS }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={String(n)}>{n} {n === 1 ? "tydzień" : n < 5 ? "tygodnie" : "tygodni"} przed porodem</option>
                ))}
                <option value="custom">Inna data…</option>
              </select>
            </Field>
            {weeksBefore(a) === "custom" && (
              <DateField label="Dokładna data rozpoczęcia" value={a.maternityStart} error={dateErrors(a).maternityStart}
                onChange={(maternityStart) => set({ maternityStart })} />
            )}
          </div>
        )}
        {(a.role !== "FATHER" || a.partnerInsured !== "NO") && (
          <Slider label="Ile tygodni rodzicielskiego weźmie tata?" unit="tyg." min={0}
            max={parentalPool(a) - PARAMS.PARENTAL_NONTRANSFERABLE_WEEKS} value={String(a.fatherParentalWeeks)}
            hint={`${PARAMS.PARENTAL_NONTRANSFERABLE_WEEKS} tygodni jest tylko dla taty i ${PARAMS.PARENTAL_NONTRANSFERABLE_WEEKS} tylko dla mamy - nie można ich oddać drugiemu rodzicowi (przepadają, jeśli ich nie wykorzysta). Pozostałe tygodnie rodzice dzielą dowolnie.`}
            onChange={(v) => set({ fatherParentalWeeks: v === "" ? 0 : Math.min(Number(v), parentalPool(a) - PARAMS.PARENTAL_NONTRANSFERABLE_WEEKS) })} />
        )}
        {a.role === "MOTHER" && (
          <div className="space-y-3">
            <Choice legend="Czy chcesz łączyć urlop rodzicielski z pracą?" value={a.workFraction} columns={3} onChange={(workFraction) => set({ workFraction })} options={[
              { value: "0", label: "Nie" }, { value: "0.25", label: "Tak, ¼ etatu" }, { value: "0.5", label: "Tak, ½ etatu" },
            ]} />
            {a.workFraction !== "0" && (
              <Slider label="Przez ile tygodni urlopu chcesz pracować?" unit="tyg." min={1} max={parentalPool(a)} value={a.workWeeks}
                hint="Urlop wydłuży się proporcjonalnie, zasiłek będzie niższy o ułamek etatu." onChange={(workWeeks) => set({ workWeeks })} />
            )}
          </div>
        )}
      </div>
    ),
  },
  {
    id: "salary",
    title: "Wynagrodzenie",
    visible: (a) => a.role !== null && a.title !== "NONE",
    complete: (a) => !moneyError(a.salaryGross),
    summary: (a) => {
      const v = normalizeMoney(a.salaryGross);
      return v ? `${formatMoney(v)} brutto` : "nie podano";
    },
    render: ({ a, set }) => (
      <div className="space-y-4">
        <ZusFetch source="salary" a={a} set={set}
          what={a.title === "SELF_EMPLOYED" ? "Pobierz zadeklarowaną podstawę składek z ostatnich 12 miesięcy." : "Pobierz podstawę wymiaru z ostatnich 12 miesięcy."} />
        <MoneyField label={a.title === "SELF_EMPLOYED" ? "Zadeklarowana podstawa składek (zł / miesiąc)" : "Wynagrodzenie brutto (zł / miesiąc)"}
          value={a.salaryGross} emptyLabel="nie podano - bez kwot"
          hint="Przyjmujemy kwotę stałą przez 12 miesięcy; od brutto odejmujemy składki społeczne. Puste = pokażemy okresy bez kwot."
          onChange={(salaryGross) => set({ salaryGross })} />
      </div>
    ),
  },
  {
    id: "optimize",
    title: "Optymalizacja",
    visible: optimizerVisible,
    complete: () => true,
    summary: (a) => (a.plannerApplied ? "Plan zastosowany"
      : a.plannerChoices.length ? `Wybrane decyzje: ${a.plannerChoices.length}` : null),
    render: ({ a, set }) => <Optimizer a={a} set={set} />,
  },
];
