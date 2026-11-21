"use client";

// SYMULACJA konta użytkownika testowego: dane z ZUS, e-ZLA, zaświadczenie o stanie rozliczeń składek, pytanie przez PUE/eZUS.
// Każda zakładka ma stały baner „SYMULACJA” z nazwą docelowej integracji. Dane fikcyjne (users.ts, simApi.ts).
import { useEffect, useState } from "react";
import { formatDate, formatMoney } from "@/lib/format";
import { RuleText } from "../main-flow/RuleList";
import { PARAMS } from "../main-flow/preview/params";
import { type SimDebtCertificate, type SimEzla, type SimPueTicket, type SimPueTopic, localToday, simDebtCertificate, simEzla, simPueQuestion, usedLeaveText } from "./simApi";
import { SimModal, simBtnPrimary, simBtnSecondary } from "./ui";
import { EZLA_CODE_LABEL, type TestUser, fullName, initials } from "./users";

type Tab = "profile" | "ezla" | "debt" | "pue";
const TABS: { id: Tab; label: string; integration: string }[] = [
  { id: "profile", label: "Dane z ZUS", integration: "Centralnym Rejestrem Ubezpieczonych ZUS (dane o ubezpieczeniu i płatniku)" },
  { id: "ezla", label: "e-ZLA", integration: "systemem elektronicznych zwolnień lekarskich e-ZLA" },
  { id: "debt", label: "Składki", integration: "usługą zaświadczeń o niezaleganiu w opłacaniu składek (PUE/eZUS)" },
  { id: "pue", label: "Zapytaj ZUS", integration: "kanałem wiadomości PUE/eZUS" },
];


function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-zinc-100 py-2 text-sm sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-zinc-600">{k}</dt><dd className="font-medium text-zinc-900">{v}</dd>
    </div>
  );
}

function Loading() {
  return <p role="status" className="py-6 text-center text-sm text-zinc-600">Pobieranie danych (symulacja)…</p>;
}

function ProfileTab({ u }: { u: TestUser }) {
  return (
    <dl>
      <Row k="Ubezpieczony" v={fullName(u)} />
      <Row k="Tytuł ubezpieczenia" v={u.titleLabel} />
      <Row k="Płatnik składek" v={u.payerName} />
      <Row k="Ubezpieczenie chorobowe od" v={formatDate(u.insuredFrom)} />
      <Row k="Dobrowolne chorobowe" v={u.title === "EMPLOYMENT" ? "nie dotyczy (obowiązkowe)" : u.voluntarySickness ? "tak, opłacane" : "nie"} />
      <Row k="Płatnik zgłasza" v={u.payerSize === "GT20" ? `więcej niż ${PARAMS.PAYER_INSURED_THRESHOLD} osób (zasiłek wypłaca płatnik)` : u.payerSize === "LE20" ? `${PARAMS.PAYER_INSURED_THRESHOLD} osób lub mniej (zasiłek wypłaca ZUS)` : "nie dotyczy - zasiłek wypłaca ZUS"} />
      <Row k="Średnia podstawa (12 mies.)" v={`${formatMoney(u.salaryAvg)} brutto / mies.`} />
      <Row k="Wypłacone zasiłki rodzicielskie" v={u.usedLeave ? usedLeaveText(u.usedLeave) : "brak"} />
    </dl>
  );
}

function EzlaTab({ u }: { u: TestUser }) {
  const [list, setList] = useState<SimEzla[] | null>(null);
  useEffect(() => { let on = true; simEzla(u.id).then((r) => on && setList(r.certificates)); return () => { on = false; }; }, [u.id]);
  if (!list) return <Loading />;
  if (list.length === 0) return <p className="py-4 text-sm text-zinc-700">Brak zaświadczeń lekarskich e-ZLA na koncie testowym.</p>;
  return (
    <ul className="space-y-3">
      {list.map((c) => (
        <li key={c.certificate_id} className="rounded-xl border border-zinc-200 p-3 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-mono text-xs text-zinc-600">{c.certificate_id}</span>
            {c.issued_at && <span className="text-xs text-zinc-600">wystawione {formatDate(c.issued_at)}</span>}
          </div>
          <p className="mt-1 font-semibold text-zinc-900">Niezdolność do pracy: {formatDate(c.from)} – {formatDate(c.to)}</p>
          <ul className="mt-1 space-y-0.5 text-zinc-700">
            {c.codes.map((code) => <li key={code}><span className="mr-1 rounded bg-zinc-100 px-1.5 font-mono font-semibold">{code}</span>{EZLA_CODE_LABEL[code]}</li>)}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function DebtTab({ u }: { u: TestUser }) {
  const [asOf, setAsOf] = useState(localToday);
  const [cert, setCert] = useState<SimDebtCertificate | null>(null);
  const [busy, setBusy] = useState(false);
  const get = async () => { setBusy(true); setCert(await simDebtCertificate(u.id, asOf)); setBusy(false); };
  return (
    <div className="space-y-4 text-sm">
      <p className="text-zinc-700">Zaświadczenie o stanie rozliczeń składek na wskazany dzień - przy działalności gospodarczej ważne na dzień powstania prawa do zasiłku.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="font-medium">Na dzień
          <input type="date" value={asOf} onChange={(e) => { setAsOf(e.target.value); setCert(null); }}
            className="mt-1 block rounded-md border border-zinc-500 px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-zinc-900" />
        </label>
        <button type="button" onClick={get} disabled={busy || !asOf} className={simBtnPrimary}>{busy ? "Generowanie…" : "Wygeneruj zaświadczenie"}</button>
      </div>
      <div aria-live="polite">
        {cert && (
          <article className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Zaświadczenie (wzór poglądowy, bez mocy prawnej)</p>
            <p className="mt-1 font-mono text-xs text-zinc-600">nr {cert.certificate_number}</p>
            <dl className="mt-2">
              <Row k="Dotyczy" v={fullName(u)} />
              <Row k="Stan na dzień" v={formatDate(cert.as_of)} />
              <Row k="Zaległość w składkach" v={formatMoney(cert.amount)} />
              <Row k="Próg dopuszczalnej zaległości" v={formatMoney(cert.threshold)} />
            </dl>
            <p className={`mt-3 rounded-md p-2 font-medium ${cert.exceeds_threshold ? "bg-red-50 text-red-900" : "bg-emerald-50 text-emerald-900"}`}>
              {cert.exceeds_threshold
                ? "Zaległość przekracza próg z art. 2a ustawy zasiłkowej. Skutek dla prawa do zasiłku (m.in. przy działalności gospodarczej, z wyjątkami) oceni kalkulator."
                : "Zaległość nie przekracza progu z art. 2a ustawy zasiłkowej."}
              <span className="mt-1 block text-xs font-normal">Przepis: <RuleText entry="GEN-EXCL-001" /></span>
            </p>
          </article>
        )}
      </div>
    </div>
  );
}

const TOPICS: { value: SimPueTopic; label: string }[] = [
  { value: "MATERNITY", label: "Zasiłek macierzyński" }, { value: "PARENTAL", label: "Urlop i zasiłek rodzicielski" },
  { value: "SICKNESS", label: "Zasiłek chorobowy w ciąży" }, { value: "DOCUMENTS", label: "Dokumenty i wnioski" }, { value: "OTHER", label: "Inne" },
];

function PueTab({ u }: { u: TestUser }) {
  const [topic, setTopic] = useState<SimPueTopic>("MATERNITY");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState<SimPueTicket | null>(null);
  const send = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setTicket(await simPueQuestion(u.id, topic, q.trim())); setBusy(false); };
  if (ticket) {
    return (
      <div role="status" className="space-y-3 text-sm">
        <p className="text-base font-semibold text-zinc-900">Wiadomość przyjęta (symulacja)</p>
        <dl><Row k="Numer zgłoszenia" v={<span className="font-mono">{ticket.ticket_id}</span>} /><Row k="Status" v="przyjęta" />
          {ticket.expected_response_days && <Row k="Symulowany czas odpowiedzi" v={`${ticket.expected_response_days} dni robocze`} />}</dl>
        <p className="text-zinc-600">Nic nie zostało wysłane. W wersji produkcyjnej odpowiedź pojawi się na koncie PUE/eZUS.</p>
        <button type="button" onClick={() => { setTicket(null); setQ(""); }} className={simBtnSecondary}>Zadaj kolejne pytanie</button>
      </div>
    );
  }
  return (
    <form onSubmit={send} className="space-y-3 text-sm">
      <label className="block font-medium">Temat
        <select value={topic} onChange={(e) => setTopic(e.target.value as SimPueTopic)}
          className="mt-1 block w-full rounded-md border border-zinc-500 bg-white px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-zinc-900">
          {TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>
      <label className="block font-medium">Pytanie
        <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={4} maxLength={2000} placeholder="np. Czy muszę dostarczyć akt urodzenia dziecka?"
          className="mt-1 block w-full rounded-md border border-zinc-500 px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-zinc-900" />
        <span className="mt-1 block text-xs font-normal text-zinc-600">Nie wpisuj prawdziwych danych osobowych - to symulacja.</span>
      </label>
      <button type="submit" disabled={busy || q.trim().length < 3} className={simBtnPrimary}>{busy ? "Wysyłanie…" : "Wyślij (symulacja)"}</button>
    </form>
  );
}

export function AccountPanel({ user, onClose, onLogout }: { user: TestUser; onClose: () => void; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("profile");
  const current = TABS.find((t) => t.id === tab)!;
  // Wzorzec WAI-ARIA Tabs: strzałki, Home, End przenoszą wybór i fokus.
  const onTabKey = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const map: Record<string, number> = { ArrowRight: (i + 1) % TABS.length, ArrowLeft: (i - 1 + TABS.length) % TABS.length, Home: 0, End: TABS.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const next = TABS[map[e.key]].id;
    setTab(next);
    setTimeout(() => document.getElementById(`simtab-${next}`)?.focus(), 0);
  };
  return (
    <SimModal title="Moje konto testowe" integration={current.integration} onClose={onClose} wide>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-200 font-semibold">{initials(user)}</span>
          <div>
            <p className="font-semibold text-zinc-900">{fullName(user)}</p>
            <p className="text-xs text-zinc-600">Użytkownik testowy · {user.persona.toLowerCase()}</p>
          </div>
        </div>
        <button type="button" onClick={onLogout} className={simBtnSecondary}>Wyloguj</button>
      </div>
      <div role="tablist" aria-label="Usługi (symulacja)" className="mt-5 flex gap-1 overflow-x-auto border-b border-zinc-200">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" id={`simtab-${t.id}`} aria-selected={tab === t.id} aria-controls="simtab-panel"
            tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)} onKeyDown={onTabKey}
            className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-zinc-900 ${tab === t.id ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-600 hover:text-zinc-900"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div id="simtab-panel" role="tabpanel" aria-labelledby={`simtab-${tab}`} className="pt-4">
        {tab === "profile" && <ProfileTab u={user} />}
        {tab === "ezla" && <EzlaTab u={user} />}
        {tab === "debt" && <DebtTab u={user} />}
        {tab === "pue" && <PueTab u={user} />}
      </div>
    </SimModal>
  );
}
