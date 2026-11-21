"use client";

// Kroki kreatora: najpierw pytania, które wykluczają całe gałęzie (kim jesteś → etap → zdarzenie → ubezpieczenie).
// Każdy krok ma warunek widoczności — pytanie pojawia się tylko wtedy, gdy ma znaczenie dla wyniku.
import type { Answers } from "./answers";
import { Check, Choice, Field, TRI_OPTIONS, inputCls } from "./fields";

export type StepProps = { a: Answers; set: (patch: Partial<Answers>) => void };
export type Step = {
  id: string;
  title: string;
  visible: (a: Answers) => boolean;
  complete: (a: Answers) => boolean;
  render: (p: StepProps) => React.ReactNode;
};

const isBirth = (a: Answers) => a.role !== "GUARDIAN";
const isWorker = (a: Answers) => a.title === "EMPLOYMENT" || a.title === "MANDATE";

export const STEPS: Step[] = [
  {
    id: "role",
    title: "Kim jesteś?",
    visible: (a) => !a.sensitive,
    complete: (a) => a.role !== null,
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
            <Field label="Wiek dziecka (lata)">
              <input inputMode="numeric" className={inputCls} value={a.childAgeYears} onChange={(e) => set({ childAgeYears: e.target.value.replace(/\D/g, "") })} />
            </Field>
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
    complete: (a) => !a.preterm || (a.gestationWeeks !== "" || a.birthWeightG !== ""),
    render: ({ a, set }) => (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600">Zaznacz, jeśli dotyczy. Jeśli dziecko jeszcze się nie urodziło, możesz wrócić do tego kroku później.</p>
        <Check label="Wcześniak lub pobyt dziecka w szpitalu" hint="Może przysługiwać urlop uzupełniający (do 8 lub 15 tygodni)."
          checked={a.preterm} onChange={(preterm) => set({ preterm })} />
        {a.preterm && (
          <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-2">
            <Field label="Ukończony tydzień ciąży przy porodzie">
              <input inputMode="numeric" className={inputCls} value={a.gestationWeeks} onChange={(e) => set({ gestationWeeks: e.target.value.replace(/\D/g, "") })} />
            </Field>
            <Field label="Masa urodzeniowa (g)" hint="Przy kilkorgu dzieci: najniższa.">
              <input inputMode="numeric" className={inputCls} value={a.birthWeightG} onChange={(e) => set({ birthWeightG: e.target.value.replace(/\D/g, "") })} />
            </Field>
            <Field label="Łącznie tygodni w szpitalu" hint="Kilka pobytów sumuje się; niepełny tydzień liczy się jako pełny. Przy kilkorgu dzieci: najdłuższa.">
              <input inputMode="numeric" className={inputCls} value={a.hospitalWeeks} onChange={(e) => set({ hospitalWeeks: e.target.value.replace(/\D/g, "") })} />
            </Field>
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
          <Field label="Od kiedy podlegasz ubezpieczeniu chorobowemu?" hint="W wersji produkcyjnej: pobranie z danych ZUS (tu: wpisz ręcznie).">
            <input type="date" className={inputCls} value={a.insuredFrom} onChange={(e) => set({ insuredFrom: e.target.value })} />
          </Field>
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
            <Field label="Zaległość w składkach na dzień porodu (zł)" hint="0, jeśli brak. W wersji produkcyjnej: zaświadczenie o niezaleganiu (symulacja).">
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
    render: ({ a, set }) => (
      <div className="space-y-4">
        <Choice legend="Czy urlop macierzyński został wykorzystany w całości?" value={a.usedMaternityFully} columns={3}
          onChange={(usedMaternityFully) => set({ usedMaternityFully })} options={TRI_OPTIONS} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Rodzicielski mamy (tyg.)">
            <input inputMode="numeric" className={inputCls} value={a.usedParentalMotherWeeks} onChange={(e) => set({ usedParentalMotherWeeks: e.target.value.replace(/\D/g, "") })} />
          </Field>
          <Field label="Rodzicielski taty (tyg.)">
            <input inputMode="numeric" className={inputCls} value={a.usedParentalFatherWeeks} onChange={(e) => set({ usedParentalFatherWeeks: e.target.value.replace(/\D/g, "") })} />
          </Field>
          <Field label="Liczba części (wniosków)" hint="Każdy wniosek to osobna część.">
            <input inputMode="numeric" className={inputCls} value={a.usedParts} onChange={(e) => set({ usedParts: e.target.value.replace(/\D/g, "") })} />
          </Field>
        </div>
        <Choice legend="Jaki wariant wypłaty wybrano?" value={a.usedVariant} columns={3} onChange={(usedVariant) => set({ usedVariant })} options={[
          { value: "COMBINED_815", label: "81,5% przez cały okres" },
          { value: "FULL_100_70", label: "100%, potem 70%" },
          { value: "UNKNOWN", label: "Nie wiem", description: "symulacja: sprawdź w PUE/eZUS" },
        ]} />
      </div>
    ),
  },
  {
    id: "partner",
    title: "Partnerka",
    visible: (a) => a.role === "FATHER",
    complete: () => true,
    render: ({ a, set }) => (
      <div className="space-y-4">
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
    render: ({ a, set }) => (
      <div className="space-y-5">
        {a.role === "MOTHER" && (
          <Field label="Kiedy chcesz zacząć urlop macierzyński? (opcjonalnie)" hint="Najwcześniej 6 tygodni przed porodem. Puste = w dniu porodu.">
            <input type="date" className={inputCls} value={a.maternityStart} onChange={(e) => set({ maternityStart: e.target.value })} />
          </Field>
        )}
        {(a.role !== "FATHER" || a.partnerInsured !== "NO") && (
          <Field label={`Ile tygodni rodzicielskiego weźmie tata? ${a.fatherParentalWeeks} tyg.`}
            hint="9 tygodni jest tylko dla taty (przepadają, jeśli ich nie weźmie). Reszta to pula mamy.">
            <input type="range" min={0} max={32} step={1} className="mt-2 w-full accent-zus-green-dark" value={a.fatherParentalWeeks}
              onChange={(e) => set({ fatherParentalWeeks: Number(e.target.value) })} />
          </Field>
        )}
        {a.role === "MOTHER" && (
          <div className="space-y-3">
            <Choice legend="Czy chcesz łączyć urlop rodzicielski z pracą?" value={a.workFraction} columns={3} onChange={(workFraction) => set({ workFraction })} options={[
              { value: "0", label: "Nie" }, { value: "0.25", label: "Tak, ¼ etatu" }, { value: "0.5", label: "Tak, ½ etatu" },
            ]} />
            {a.workFraction !== "0" && (
              <Field label="Przez ile tygodni urlopu chcesz pracować?" hint="Urlop wydłuży się proporcjonalnie, zasiłek będzie niższy o ułamek etatu.">
                <input inputMode="numeric" className={inputCls} value={a.workWeeks} onChange={(e) => set({ workWeeks: e.target.value.replace(/\D/g, "") })} />
              </Field>
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
    render: ({ a, set }) => (
      <Field label={a.title === "SELF_EMPLOYED" ? "Zadeklarowana podstawa składek (zł / miesiąc)" : "Wynagrodzenie brutto (zł / miesiąc)"}
        hint="Przyjmujemy kwotę stałą przez 12 miesięcy; podstawa = brutto − 13,71%. Pełne wyliczenie z Z-3 — ścieżka „Mam dokumenty”. Puste = bez kwot.">
        <input inputMode="decimal" className={inputCls} value={a.salaryGross} onChange={(e) => set({ salaryGross: e.target.value })} />
      </Field>
    ),
  },
];
