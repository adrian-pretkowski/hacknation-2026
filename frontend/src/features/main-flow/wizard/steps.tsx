"use client";

// Kroki kreatora: najpierw pytania, które wykluczają całe gałęzie (kim jesteś → etap → zdarzenie → ubezpieczenie).
// Każdy krok ma warunek widoczności — pytanie pojawia się tylko wtedy, gdy ma znaczenie dla wyniku.
import { formatDate, formatMoney } from "@/lib/format";
import { PARAMS } from "../preview/params";
import { addDays, daysBetween } from "../preview/exact";
import type { Answers } from "./answers";
import { Check, Choice, Field, NumberSelect, Slider, TRI_OPTIONS, inputCls } from "./fields";
import { Optimizer, optimizerVisible } from "./Optimizer";
import { ZusFetch } from "./ZusFetch";

const plYears = (n: number) => `${n} ${n === 1 ? "rok" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "lata" : "lat"}`;
const weeksBefore = (a: Answers): string => {
  if (!a.maternityStart || !a.eventDate) return "0";
  const d = daysBetween(a.maternityStart, a.eventDate);
  return d % PARAMS.WEEK_AS_DAYS === 0 && d >= 0 && d <= PARAMS.PRE_BIRTH_MAX_WEEKS * PARAMS.WEEK_AS_DAYS
    ? String(d / PARAMS.WEEK_AS_DAYS) : "custom";
};
// FE1-05: masa urodzeniowa liczy się tylko względem progu (KP art. 180(2) § 1) — pytanie z opcjami zamiast suwaka.
const WEIGHT_LIMIT = `${PARAMS.SUPP_WEIGHT_THRESHOLD_G.toLocaleString("pl-PL")} g`;
const WEIGHT_OPTIONS = [
  { value: "YES" as const, label: `Do ${WEIGHT_LIMIT}` },
  { value: "NO" as const, label: `Powyżej ${WEIGHT_LIMIT}` },
  { value: "UNKNOWN" as const, label: "Nie wiem" },
];
/** Przy porodzie przed SUPP_GESTATION_EARLY_WEEK masa nie zmienia wyniku (SUPP-ELIG-001 i tak przysługuje). */
const weightMatters = (a: Answers) => a.gestationWeeks === "" || Number(a.gestationWeeks) >= PARAMS.SUPP_GESTATION_EARLY_WEEK;
const parentalPool = (a: Answers) => a.zaZyciem
  ? (a.children > 1 ? PARAMS.PARENTAL_WEEKS_ZA_ZYCIEM_MULTIPLE : PARAMS.PARENTAL_WEEKS_ZA_ZYCIEM_SINGLE)
  : (a.children > 1 ? PARAMS.PARENTAL_WEEKS_MULTIPLE : PARAMS.PARENTAL_WEEKS_SINGLE);

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
const TITLE_TEXT = { EMPLOYMENT: "Umowa o pracę", MANDATE: "Umowa zlecenia", SELF_EMPLOYED: "Działalność (JDG)", NONE: "Bez ubezpieczenia / nie wiem" } as const;
const GUARDIAN_TEXT = { ADOPTION: "Adopcja", FOSTER_NON_PROFESSIONAL: "Rodzina zastępcza niezawodowa", FOSTER_PROFESSIONAL: "Zawodowa rodzina zastępcza" } as const;
const plWeeks = (n: number) => `${n} tydz.`;
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
    complete: (a) => !!a.eventDate && a.children >= 1 && (a.role !== "GUARDIAN" || a.childAgeYears !== ""),
    summary: (a) => join([
      a.eventDate && `${a.role === "GUARDIAN" ? "Przyjęcie dziecka" : a.stage === "BORN" ? "Poród" : "Poród planowany"} ${formatDate(a.eventDate)}`,
      a.children > 1 && `${a.children} dzieci`,
      a.role === "GUARDIAN" && a.childAgeYears !== "" && `wiek ${plYears(Number(a.childAgeYears))}`]),
    render: ({ a, set }) => (
      <div className="space-y-4">
        <Field label={a.role === "GUARDIAN" ? "Data przyjęcia dziecka" : a.stage === "BORN" ? "Data porodu" : "Planowana data porodu"}
          hint={a.stage === "PREGNANT" ? "Z karty ciąży; wynik będzie prognozą." : undefined}>
          <input type="date" className={inputCls} value={a.eventDate} onChange={(e) => set({ eventDate: e.target.value })} />
        </Field>
        <Field label={a.role === "GUARDIAN" ? "Ile dzieci przyjmujesz jednocześnie?" : "Ile dzieci przy jednym porodzie?"}>
          <select className={inputCls} value={a.children} onChange={(e) => set({ children: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 5 ? "5 lub więcej" : n}</option>)}
          </select>
        </Field>
        {a.role === "GUARDIAN" && (
          <>
            <NumberSelect label="Wiek dziecka" value={a.childAgeYears} from={0} to={17} unit={plYears} unknownLabel="Wybierz wiek"
              onChange={(childAgeYears) => set({ childAgeYears })} />
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
    complete: (a) => a.lossKind === "STILLBORN" || !!a.deathDate,
    summary: (a) => (a.lossKind === "STILLBORN" ? "Martwe urodzenie" : join(["Zgon po porodzie", a.deathDate && formatDate(a.deathDate)])),
    render: ({ a, set }) => (
      <div className="space-y-4">
        <p className="text-sm text-zinc-700">Bardzo nam przykro. Zapytamy tylko o to, co niezbędne.</p>
        <Choice legend="Co się wydarzyło?" value={a.lossKind} columns={2} onChange={(lossKind) => set({ lossKind, stillborn: true })} options={[
          { value: "STILLBORN", label: "Dziecko urodziło się martwe" },
          { value: "DIED", label: "Dziecko zmarło po porodzie" },
        ]} />
        {a.lossKind === "DIED" && (
          <Field label="Data śmierci dziecka">
            <input type="date" className={inputCls} value={a.deathDate} onChange={(e) => set({ deathDate: e.target.value })} />
          </Field>
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
      a.preterm && weightMatters(a) && a.lowBirthWeight !== "UNKNOWN" && `${a.lowBirthWeight === "YES" ? "do" : "powyżej"} ${WEIGHT_LIMIT}`,
      a.preterm && a.hospitalWeeks !== "" && `szpital ${plWeeks(Number(a.hospitalWeeks))}`,
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
                  value={a.lowBirthWeight} columns={3} onChange={(lowBirthWeight) => set({ lowBirthWeight })} options={WEIGHT_OPTIONS} />
              </div>
            )}
            <div className="sm:col-span-2">
              <Slider label="Łącznie tygodni w szpitalu" unit="tyg." min={0} max={26} value={a.hospitalWeeks}
                hint="Kilka pobytów sumuje się; niepełny tydzień liczy się jako pełny. Przy kilkorgu dzieci: najdłuższy pobyt."
                onChange={(hospitalWeeks) => set({ hospitalWeeks })} />
            </div>
            {Number(a.gestationWeeks) >= 37 && (
              <Choice legend="Czy pobyt w szpitalu (≥ 2 dni) zaczął się między 5. a 28. dniem życia?" value={a.lateHospitalQualifies}
                columns={3} onChange={(lateHospitalQualifies) => set({ lateHospitalQualifies })} options={TRI_OPTIONS} />
            )}
          </div>
        )}
        <Check label="Zaświadczenie „Za życiem”" hint="Ciężkie i nieodwracalne upośledzenie lub nieuleczalna choroba — dłuższy urlop rodzicielski."
          checked={a.zaZyciem} onChange={(zaZyciem) => set({ zaZyciem })} />
      </div>
    ),
  },
  {
    id: "insurance",
    title: "Praca i ubezpieczenie",
    visible: (a) => a.role !== null,
    complete: (a) => a.title !== null && (a.title === "NONE" || !!a.insuredFrom)
      && (a.title !== "EMPLOYMENT" || a.contractType !== null),
    summary: (a) => (a.title ? join([TITLE_TEXT[a.title], a.title !== "NONE" && a.insuredFrom && `od ${formatDate(a.insuredFrom)}`,
      a.contractType === "FIXED_TERM" && "na czas określony"]) : null),
    render: ({ a, set }) => (
      <div className="space-y-4">
        <Choice legend="Z jakiego tytułu masz ubezpieczenie?" value={a.title} onChange={(title) => set({ title })} options={[
          { value: "EMPLOYMENT", label: "Umowa o pracę" },
          { value: "MANDATE", label: "Umowa zlecenia" },
          { value: "SELF_EMPLOYED", label: "Działalność gospodarcza (JDG)" },
          { value: "NONE", label: "Nie pracuję / nie wiem", description: "sprawdzimy inne możliwości" },
        ]} />
        {(a.title === "MANDATE" || a.title === "SELF_EMPLOYED") && (
          <Choice legend="Czy opłacasz dobrowolne ubezpieczenie chorobowe?" hint="Bez niego nie ma zasiłku macierzyńskiego z tego tytułu."
            value={a.voluntarySickness} columns={3} onChange={(voluntarySickness) => set({ voluntarySickness })} options={TRI_OPTIONS} />
        )}
        {a.title && a.title !== "NONE" && (
          <>
            <ZusFetch source="insurance" a={a} set={set} what="Nie pamiętasz dat? Pobierzemy okres ubezpieczenia i dane płatnika." />
            <Field label="Od kiedy podlegasz ubezpieczeniu chorobowemu?" hint="Wpisz ręcznie albo pobierz powyżej.">
              <input type="date" className={inputCls} value={a.insuredFrom} onChange={(e) => set({ insuredFrom: e.target.value })} />
            </Field>
          </>
        )}
        {a.title === "EMPLOYMENT" && (
          <>
            <Choice legend="Rodzaj umowy" value={a.contractType} onChange={(contractType) => set({ contractType })} options={[
              { value: "INDEFINITE", label: "Na czas nieokreślony" },
              { value: "FIXED_TERM", label: "Na czas określony / próbny" },
            ]} />
            {a.contractType === "FIXED_TERM" && (
              <Field label="Do kiedy trwa umowa?">
                <input type="date" className={inputCls} value={a.contractEnd} onChange={(e) => set({ contractEnd: e.target.value })} />
              </Field>
            )}
            {a.contractType === "FIXED_TERM" && a.contractEnd && a.eventDate && a.contractEnd < a.eventDate && (
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
        {a.title === "SELF_EMPLOYED" && (
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
    visible: (a) => a.stage === "BORN" && a.role === "MOTHER" && !a.sensitive,
    complete: () => true,
    summary: (a) => join([`mama ${plWeeks(Number(a.usedParentalMotherWeeks || 0))}`, `tata ${plWeeks(Number(a.usedParentalFatherWeeks || 0))}`,
      Number(a.usedParts) > 0 && `${a.usedParts} cz.`]),
    render: ({ a, set }) => (
      <div className="space-y-4">
        <ZusFetch source="usedLeave" a={a} set={set} what="Pobierz wykorzystane już urlopy i wypłacone zasiłki." />
        <Choice legend="Czy urlop macierzyński został wykorzystany w całości?" value={a.usedMaternityFully} columns={3}
          onChange={(usedMaternityFully) => set({ usedMaternityFully })} options={TRI_OPTIONS} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Slider label="Rodzicielski wykorzystany przez mamę" unit="tyg." min={0} max={parentalPool(a)} value={a.usedParentalMotherWeeks}
            emptyLabel="0 tyg." onChange={(usedParentalMotherWeeks) => set({ usedParentalMotherWeeks })} />
          <Slider label="Rodzicielski wykorzystany przez tatę" unit="tyg." min={0} max={parentalPool(a)} value={a.usedParentalFatherWeeks}
            emptyLabel="0 tyg." onChange={(usedParentalFatherWeeks) => set({ usedParentalFatherWeeks })} />
        </div>
        <NumberSelect label="Na ile części (wniosków) podzielono rodzicielski?" hint="Każdy wniosek to osobna część." value={a.usedParts}
          from={0} to={PARAMS.PARENTAL_MAX_PARTS} unknownLabel={null} unit={(n) => (n === 0 ? "Jeszcze nie korzystaliśmy" : `${n}`)}
          onChange={(usedParts) => set({ usedParts })} />
        <Choice legend="Jaki wariant wypłaty wybrano?" value={a.usedVariant} columns={3} onChange={(usedVariant) => set({ usedVariant })} options={[
          { value: "COMBINED_815", label: "81,5% przez cały okres" },
          { value: "FULL_100_70", label: "100%, potem 70%" },
          { value: "UNKNOWN", label: "Nie wiem", description: "pobierz dane z ZUS powyżej (symulacja)" },
        ]} />
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
    complete: () => true,
    summary: (a) => {
      const wb = weeksBefore(a);
      return join([
        a.role === "MOTHER" && (wb === "0" ? "start w dniu porodu" : wb === "custom" ? `start ${formatDate(a.maternityStart)}` : `start ${wb} tydz. przed porodem`),
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
              <Field label="Dokładna data rozpoczęcia">
                <input type="date" className={inputCls} value={a.maternityStart} onChange={(e) => set({ maternityStart: e.target.value })} />
              </Field>
            )}
          </div>
        )}
        {(a.role !== "FATHER" || a.partnerInsured !== "NO") && (
          <Slider label="Ile tygodni rodzicielskiego weźmie tata?" unit="tyg." min={0}
            max={parentalPool(a) - PARAMS.PARENTAL_NONTRANSFERABLE_WEEKS} value={String(a.fatherParentalWeeks)}
            hint={`${PARAMS.PARENTAL_NONTRANSFERABLE_WEEKS} tygodni jest tylko dla taty (przepadają, jeśli ich nie weźmie). Reszta to pula mamy.`}
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
    complete: () => true,
    summary: (a) => {
      const v = a.salaryGross.replace(",", ".");
      return /^\d+(\.\d{1,2})?$/.test(v) ? `${formatMoney(v)} brutto` : "nie podano";
    },
    render: ({ a, set }) => (
      <div className="space-y-4">
        <ZusFetch source="salary" a={a} set={set}
          what={a.title === "SELF_EMPLOYED" ? "Pobierz zadeklarowaną podstawę składek z ostatnich 12 miesięcy." : "Pobierz podstawę wymiaru z ostatnich 12 miesięcy."} />
        <Slider label={a.title === "SELF_EMPLOYED" ? "Zadeklarowana podstawa składek (zł / miesiąc)" : "Wynagrodzenie brutto (zł / miesiąc)"}
          unit="zł" money min={0} max={30000} step={100} value={a.salaryGross} emptyLabel="nie podano — bez kwot"
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
