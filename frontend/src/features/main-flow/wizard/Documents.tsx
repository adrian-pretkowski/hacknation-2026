"use client";

/* FE1-49: panel „Co i gdzie złożyć” - kolumny wg adresata (wybór lidera z 3 propozycji): komu co zanieść,
 * ikona instytucji, pisma z ikoną rodzaju, wystawcą i znakiem „ZUS pobierze sam”. */
import type { EvaluateResponse } from "@/lib/api";
import { DOC_LABEL, PAYER_LABEL } from "./labels";

type Doc = NonNullable<EvaluateResponse["missing_documents"]>[number];
type To = NonNullable<Doc["submit_to"]> | "OTHER";
const card = "rounded-lg border border-zinc-200 bg-white p-4 sm:p-5";
const label = (d: Doc) => DOC_LABEL[d.doc_type] ?? d.doc_type;
const TO: Record<To, { title: string; hint: string }> = {
  EMPLOYER: { title: "Pracodawca", hint: "lub zleceniodawca" },
  CONTRIBUTION_PAYER: { title: "Płatnik składek", hint: "dział kadr / płac" },
  ZUS: { title: "ZUS", hint: "eZUS lub placówka" },
  OTHER: { title: "Inne", hint: "adresat do ustalenia" },
};
const ORDER: To[] = ["EMPLOYER", "CONTRIBUTION_PAYER", "ZUS", "OTHER"];
/** rodzaj pisma do ikony: wniosek, zaświadczenie, akt */
const kind = (d: Doc) => d.doc_type.includes("APPLICATION") ? "app" : /CERTIFICATE_SHORT|DEATH/.test(d.doc_type) ? "act" : "cert";

const svg = "h-5 w-5";
function Icon({ name }: { name: "app" | "cert" | "act" | To }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" className={svg} aria-hidden="true" {...p}>
      {name === "app" && <><path d="M6 3h9l3 3v15H6z" /><path d="M9 10h6M9 14h6M9 18h3" /></>}
      {name === "cert" && <><path d="M5 4h14v12H5z" /><circle cx="12" cy="10" r="2.5" /><path d="M10 15l-1 5 3-1.5 3 1.5-1-5" /></>}
      {name === "act" && <><path d="M7 3h10v18H7z" /><path d="M10 7h4M10 11h4M10 15h2" /></>}
      {(name === "EMPLOYER" || name === "CONTRIBUTION_PAYER") && <><path d="M4 21V8l8-4 8 4v13" /><path d="M9 21v-6h6v6M8 11h2M14 11h2" /></>}
      {name === "ZUS" && <><path d="M3 10l9-6 9 6" /><path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9M3 21h18" /></>}
      {name === "OTHER" && <><circle cx="12" cy="12" r="8" /><path d="M12 8v5M12 16h.01" /></>}
    </svg>
  );
}
const Sim = () => <p className="mt-3 text-xs text-zinc-600">Wysyłka wniosków i pobranie odpisu z USC w tym demo to SYMULACJA.</p>;
const AutoBadge = () => <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-900 ring-1 ring-green-200">✓ ZUS pobierze sam</span>;

export function Documents({ response, payer }: { response: EvaluateResponse; payer: string | null }) {
  const docs = response.missing_documents ?? [];
  const groups = ORDER.map((t) => ({ t, items: docs.filter((d) => (d.submit_to ?? "OTHER") === t) })).filter((g) => g.items.length);
  if (groups.length === 0) return null;
  return (
    <section className={card} aria-labelledby="doc-h">
      <h3 id="doc-h" className="text-lg font-semibold">Co i gdzie złożyć</h3>
      {payer && <p className="mt-1 text-sm text-zinc-700">{PAYER_LABEL[payer]}</p>}
      <div className={`mt-3 grid gap-3 ${groups.length > 1 ? "sm:grid-cols-2" : ""} ${groups.length > 2 ? "lg:grid-cols-3" : ""}`}>
        {groups.map(({ t, items }) => (
          <div key={t} className="rounded-lg border border-zinc-200 bg-zus-gray-50">
            <div className="flex items-center gap-3 border-b border-zinc-200 px-3 py-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-zus-navy ring-1 ring-zinc-200"><Icon name={t} /></span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{TO[t].title} <span className="font-normal text-zinc-600">· {items.length}</span></p>
                <p className="text-xs text-zinc-600">{TO[t].hint}</p>
              </div>
            </div>
            <ul className="space-y-2 p-3 text-sm">
              {items.map((d, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 text-zinc-500"><Icon name={kind(d)} /></span>
                  <span className="min-w-0">
                    <span className="font-medium">{label(d)}</span>
                    {d.provider && <span className="block text-xs text-zinc-600">wystawia: {d.provider}</span>}
                    {d.obtainable_by_zus && <span className="mt-1 block"><AutoBadge /></span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Sim />
    </section>
  );
}
