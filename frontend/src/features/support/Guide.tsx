// FE2-05: przewodnik — ryzyka, ochrona z KP 177, organizacje wsparcia, linki (zus.pl, gov.pl, PIP), tryb wrażliwy.
// Treści z frontend/src/content (BA-02, interfejs I4). Komponent serwerowy — statyczne treści, bez stanu.
// Tryb wrażliwy (strata dziecka): wsparcie na górze, spokojny język, pozostałe informacje zwinięte (na żądanie).
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { type ContentBlock, GUIDE, LEGAL_PROTECTION, RISKS, SENSITIVE, SUPPORT } from "@/content";

const card = "rounded-lg border border-zinc-200 bg-white p-4 sm:p-5";
const DOC_LABEL: Record<string, string> = {
  USTAWA: "ustawa zasiłkowa", KP: "Kodeks pracy", ROZP_DOK: "rozporządzenie w sprawie dokumentów",
  ROZP_WN: "rozporządzenie w sprawie wniosków", ZALACZNIK: "treść zadania",
};

/** Minimalny Markdown z treści BA: akapity, listy „1.” i „-”, pogrubienie **…** (bez HTML z treści). */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>);
}

function Markdown({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, i) => {
        const lines = para.split("\n");
        if (lines.every((l) => /^\d+\.\s/.test(l))) {
          return <ol key={i} className="mt-2 list-decimal space-y-1 pl-5">{lines.map((l, k) => <li key={k}>{inline(l.replace(/^\d+\.\s/, ""))}</li>)}</ol>;
        }
        if (lines.every((l) => /^-\s/.test(l))) {
          return <ul key={i} className="mt-2 list-disc space-y-1 pl-5">{lines.map((l, k) => <li key={k}>{inline(l.slice(2))}</li>)}</ul>;
        }
        return <p key={i} className="mt-2">{inline(para)}</p>;
      })}
    </>
  );
}

function Block({ block, level = "h3" }: { block: ContentBlock; level?: "h2" | "h3" }) {
  const Heading = level;
  return (
    <article className="border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0">
      <Heading className="text-base font-semibold">{block.title}</Heading>
      <div className="text-sm text-zinc-800"><Markdown text={block.body_md} /></div>
      {(block.links ?? []).length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {block.links!.map((l) => (
            <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer" className="font-medium text-zus-navy underline underline-offset-2">
              {l.label}<span className="sr-only"> (otwiera się w nowej karcie)</span></a></li>
          ))}
        </ul>
      )}
      {(block.legal_basis ?? []).length > 0 && (
        <p className="mt-2 text-xs text-zinc-600">Podstawa: {block.legal_basis!.map((l) => `${DOC_LABEL[l.document] ?? l.document} ${l.location}`).join("; ")}</p>
      )}
    </article>
  );
}

function Section({ id, title, intro, blocks }: { id: string; title: string; intro?: string; blocks: ContentBlock[] }) {
  return (
    <section className={card} aria-labelledby={id}>
      <h2 id={id} className="text-lg font-semibold text-zus-navy">{title}</h2>
      {intro && <p className="mt-1 text-sm text-zinc-600">{intro}</p>}
      <div className="mt-4 space-y-4">{blocks.map((b) => <Block key={b.id} block={b} />)}</div>
    </section>
  );
}

export function Guide({ sensitive = false }: { sensitive?: boolean }) {
  const orgs = SUPPORT.filter((b) => b.kind === "SUPPORT_ORG");
  const links = SUPPORT.filter((b) => b.kind === "LINK");
  const lossOrgs = orgs.filter((b) => (b.situations ?? []).some((s) => ["STILLBIRTH", "MISCARRIAGE", "CHILD_DEATH"].includes(s)));
  const sections = (
    <>
      <Section id="guide-h" title="Krok po kroku" blocks={GUIDE} />
      <Section id="risks-h" title="Na co uważać" intro="Sygnały ryzyka — nie są decyzją ZUS. Kalkulator pokazuje je w wyniku jako ostrzeżenia." blocks={RISKS} />
      <Section id="kp-h" title="Ochrona pracy (Kodeks pracy, art. 177)" blocks={LEGAL_PROTECTION} />
      <Section id="orgs-h" title="Organizacje wsparcia" intro="Lista przykładowa — ZUS nie prowadzi zweryfikowanej listy organizacji." blocks={orgs} />
      <Section id="links-h" title="Gdzie szukać informacji" blocks={links} />
    </>
  );
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-zus-green-dark">Przewodnik</p>
        <h1 className="text-2xl font-semibold text-zus-navy">{sensitive ? "Wsparcie po stracie dziecka" : "Przewodnik przyszłego rodzica"}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {sensitive
            ? "Najważniejsze informacje i miejsca, gdzie można uzyskać pomoc. Pozostałe tematy są niżej, zwinięte."
            : "Ryzyka, ochrona pracy w ciąży, organizacje wsparcia i przydatne linki. Wynik dla Twojej sytuacji policzysz w kreatorze."}
        </p>
        <p className="mt-2 text-sm">
          {sensitive
            ? <Link href="/wsparcie" className="font-medium text-zus-navy underline underline-offset-2">Pokaż pełny przewodnik</Link>
            : <Link href="/wsparcie/spokojny" className="font-medium text-zus-navy underline underline-offset-2">Poród martwego dziecka, poronienie lub strata dziecka — tryb spokojny</Link>}
        </p>
      </header>
      {sensitive ? (
        <>
          <Section id="sens-h" title="Najważniejsze" blocks={SENSITIVE} />
          {lossOrgs.length > 0 && <Section id="loss-orgs-h" title="Gdzie szukać pomocy" blocks={lossOrgs} />}
          <details className={card}>
            <summary className="cursor-pointer text-base font-semibold">Pozostałe informacje (na żądanie)</summary>
            <div className="mt-4 space-y-5">{sections}</div>
          </details>
        </>
      ) : sections}
    </div>
  );
}
