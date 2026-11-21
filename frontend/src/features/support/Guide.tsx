// FE2-05 / FE2-06: przewodnik - ryzyka, ochrona z KP 177, organizacje wsparcia, linki (zus.pl, gov.pl, PIP), tryb wrażliwy.
// Treści z frontend/src/content (BA-02, interfejs I4) - tu tylko prezentacja. Komponent serwerowy, bez stanu.
// FE2-06: układ wizualny - nagłówek z wezwaniami do działania, spis treści, „Krok po kroku” jako oś czasu, karty z ikonami,
// klikalne telefony i e-maile, podstawa prawna jako etykiety.
// Tryb wrażliwy (strata dziecka): wsparcie na górze, spokojny język, pozostałe informacje zwinięte (na żądanie).
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { type ContentBlock, GUIDE, LEGAL_PROTECTION, RISKS, SENSITIVE, SUPPORT } from "@/content";

const DOC_LABEL: Record<string, string> = {
  USTAWA: "ustawa zasiłkowa", KP: "Kodeks pracy", ROZP_DOK: "rozporządzenie w sprawie dokumentów",
  ROZP_WN: "rozporządzenie w sprawie wniosków", ZALACZNIK: "treść zadania",
};

// ---------- ikony (inline SVG, bez zależności) ----------
type IconName = "steps" | "alert" | "shield" | "heart" | "link" | "doc" | "calendar" | "baby" | "user" | "users" | "briefcase" | "info" | "phone" | "mail" | "external" | "arrow";
const PATHS: Record<IconName, ReactNode> = {
  steps: <path d="M4 6h16M4 12h10M4 18h6" />,
  alert: <><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4M12 17.5v.01" /></>,
  shield: <><path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  doc: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 16h5" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  baby: <><circle cx="12" cy="12" r="8" /><path d="M9 11h.01M15 11h.01M9.5 15a3.5 3.5 0 0 0 5 0" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><circle cx="17" cy="9" r="2.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M15 20a5 5 0 0 1 7-4.6" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5h6v2M3 12h18" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </svg>
  );
}

// ---------- tekst: minimalny Markdown z treści BA (bez HTML z treści) ----------
// Telefony i e-maile w treści stają się linkami (tel:, mailto:) - wygodne na telefonie.
const CONTACT_RE = /(\b22 \d{3} \d{2} \d{2}\b|\b1\d{2} \d{3}\b|\b800 \d{3} \d{3}\b|(?<=pod )112\b|[\w.+-]+@[\w-]+\.[a-z]{2,})/g;

function contacts(text: string, keyBase: string): ReactNode[] {
  return text.split(CONTACT_RE).map((part, i) => {
    if (i % 2 === 0) return <Fragment key={`${keyBase}-${i}`}>{part}</Fragment>;
    const href = part.includes("@") ? `mailto:${part}` : `tel:${part.replace(/\s/g, "")}`;
    return <a key={`${keyBase}-${i}`} href={href} className="font-semibold whitespace-nowrap text-zus-navy underline underline-offset-2">{part}</a>;
  });
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-semibold text-zinc-900">{part.slice(2, -2)}</strong>
      : <Fragment key={i}>{contacts(part, String(i))}</Fragment>);
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
        return <p key={i} className="mt-2 first:mt-0">{inline(para)}</p>;
      })}
    </>
  );
}

// ---------- elementy karty ----------
function LegalTags({ block }: { block: ContentBlock }) {
  if (!(block.legal_basis ?? []).length) return null;
  return (
    <p className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-zinc-600">
      <span className="font-medium">Podstawa:</span>
      {block.legal_basis!.map((l) => (
        <span key={`${l.document}-${l.location}`} className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">{DOC_LABEL[l.document] ?? l.document} {l.location}</span>
      ))}
    </p>
  );
}

function LinkButtons({ block }: { block: ContentBlock }) {
  if (!(block.links ?? []).length) return null;
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {block.links!.map((l) => (
        <li key={l.url}>
          <a href={l.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zus-navy hover:border-zus-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark">
            {l.label}<Icon name="external" className="h-4 w-4" /><span className="sr-only"> (otwiera się w nowej karcie)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

type Tone = "green" | "amber" | "blue" | "rose" | "navy";
const TONE: Record<Tone, { badge: string; bar: string; soft: string }> = {
  green: { badge: "bg-zus-green-50 text-zus-green-dark", bar: "border-t-zus-green", soft: "bg-zus-green-50" },
  amber: { badge: "bg-zus-yellow-50 text-amber-800", bar: "border-t-zus-yellow", soft: "bg-zus-yellow-50" },
  blue: { badge: "bg-zus-blue-50 text-zus-navy", bar: "border-t-zus-blue", soft: "bg-zus-blue-50" },
  rose: { badge: "bg-rose-50 text-rose-700", bar: "border-t-rose-300", soft: "bg-rose-50" },
  navy: { badge: "bg-zus-blue-50 text-zus-navy", bar: "border-t-zus-navy", soft: "bg-zus-gray-50" },
};

const TITLE_PHONE_RE = /\b1\d{2} \d{3}\b|\b22 \d{3} \d{2} \d{2}\b|\b800 \d{3} \d{3}\b/;

function Card({ block, icon, tone, level = "h3" }: { block: ContentBlock; icon: IconName; tone: Tone; level?: "h3" | "h4" }) {
  const H = level;
  const t = TONE[tone];
  // Numer w tytule (np. telefon zaufania) - duży przycisk „Zadzwoń” zamiast samego tekstu.
  const phone = TITLE_PHONE_RE.exec(block.title)?.[0];
  return (
    <article className={`flex h-full flex-col rounded-2xl border border-t-4 border-zinc-200 bg-white p-5 shadow-sm ${t.bar}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.badge}`}><Icon name={icon} /></span>
        <H className="pt-1.5 text-base leading-snug font-semibold text-zus-navy">{block.title}</H>
      </div>
      <div className="mt-3 flex-1 text-[15px] leading-relaxed text-zinc-700"><Markdown text={block.body_md} /></div>
      {phone && (
        <a href={`tel:${phone.replace(/\s/g, "")}`}
          className="mt-4 inline-flex items-center gap-2 self-start rounded-full bg-zus-green-dark px-5 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-zus-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark">
          <Icon name="phone" /> Zadzwoń: {phone}
        </a>
      )}
      <LinkButtons block={block} />
      <LegalTags block={block} />
    </article>
  );
}

function SectionHead({ id, icon, tone, title, intro, eyebrow }: { id: string; icon: IconName; tone: Tone; title: string; intro?: string; eyebrow?: string }) {
  return (
    <div className="mb-5 flex items-start gap-4">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${TONE[tone].badge}`}><Icon name={icon} className="h-6 w-6" /></span>
      <div>
        {eyebrow && <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">{eyebrow}</p>}
        <h2 id={id} className="text-xl font-semibold text-zus-navy sm:text-2xl">{title}</h2>
        {intro && <p className="mt-1 max-w-2xl text-sm text-zinc-600">{intro}</p>}
      </div>
    </div>
  );
}

function CardSection({ id, anchor, icon, tone, title, intro, eyebrow, blocks, cardIcon }: {
  id: string; anchor: string; icon: IconName; tone: Tone; title: string; intro?: string; eyebrow?: string; blocks: ContentBlock[]; cardIcon?: IconName;
}) {
  return (
    <section id={anchor} aria-labelledby={id} className="scroll-mt-6">
      <SectionHead id={id} icon={icon} tone={tone} title={title} intro={intro} eyebrow={eyebrow} />
      <div className="grid gap-4 md:grid-cols-2">{blocks.map((b) => <Card key={b.id} block={b} icon={cardIcon ?? icon} tone={tone} />)}</div>
    </section>
  );
}

// ---------- „Krok po kroku” jako oś czasu ----------
const STEP_ICONS: IconName[] = ["doc", "calendar", "baby", "user", "users", "briefcase"];
type Step = { title: string; text: string };

/** Lista „1. **Tytuł** - opis” z treści BA → kroki osi czasu; null, gdy treść ma inny format. */
function parseSteps(md: string): Step[] | null {
  const lines = md.split("\n").filter((l) => l.trim());
  const steps = lines.map((l) => /^\d+\.\s+\*\*(.+?)\*\*\s*[-–-]\s*(.+)$/.exec(l));
  return steps.every(Boolean) ? steps.map((m) => ({ title: m![1], text: m![2] })) : null;
}

function Timeline({ block }: { block: ContentBlock }) {
  const steps = parseSteps(block.body_md);
  if (!steps) return <Card block={block} icon="steps" tone="green" />;
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
      <h3 className="text-lg font-semibold text-zus-navy">{block.title}</h3>
      <ol className="mt-5">
        {steps.map((s, i) => (
          <li key={s.title} className="relative flex gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden="true" className="absolute top-11 bottom-1 left-[21px] w-0.5 bg-zus-green-100" />}
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zus-green-dark text-white shadow-sm">
              <Icon name={STEP_ICONS[i] ?? "info"} />
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-zus-green-dark ring-2 ring-zus-green-dark">{i + 1}</span>
            </span>
            <div className="min-w-0 pt-1">
              <p className="font-semibold text-zinc-900">{s.title}</p>
              <p className="mt-0.5 text-[15px] leading-relaxed text-zinc-700">{inline(s.text.charAt(0).toLocaleUpperCase("pl-PL") + s.text.slice(1))}</p>
            </div>
          </li>
        ))}
      </ol>
      <LinkButtons block={block} />
      <LegalTags block={block} />
    </article>
  );
}

// ---------- strony ----------
const NAV = [
  { href: "#krok-po-kroku", label: "Krok po kroku", icon: "steps" as const },
  { href: "#na-co-uwazac", label: "Na co uważać", icon: "alert" as const },
  { href: "#ochrona-pracy", label: "Ochrona pracy", icon: "shield" as const },
  { href: "#wsparcie", label: "Organizacje wsparcia", icon: "heart" as const },
  { href: "#linki", label: "Gdzie szukać informacji", icon: "link" as const },
];

const chip = "inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3.5 py-2 text-sm font-medium text-zus-navy shadow-sm hover:border-zus-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark";

function FullSections() {
  const [timeline, ...otherGuide] = GUIDE;
  const orgs = SUPPORT.filter((b) => b.kind === "SUPPORT_ORG");
  const links = SUPPORT.filter((b) => b.kind === "LINK");
  return (
    <div className="space-y-14">
      <section id="krok-po-kroku" aria-labelledby="guide-h" className="scroll-mt-6">
        <SectionHead id="guide-h" icon="steps" tone="green" eyebrow="Od ciąży do powrotu do pracy" title="Krok po kroku" />
        <div className="space-y-4">
          {timeline && <Timeline block={timeline} />}
          {otherGuide.length > 0 && <div className="grid gap-4 md:grid-cols-2">{otherGuide.map((b) => <Card key={b.id} block={b} icon="info" tone="navy" />)}</div>}
        </div>
      </section>
      <CardSection id="risks-h" anchor="na-co-uwazac" icon="alert" tone="amber" title="Na co uważać" blocks={RISKS}
        intro="Sygnały ryzyka - nie są decyzją ZUS. Kalkulator pokazuje je w wyniku jako ostrzeżenia." />
      <CardSection id="kp-h" anchor="ochrona-pracy" icon="shield" tone="blue" title="Ochrona pracy" eyebrow="Kodeks pracy, art. 177" blocks={LEGAL_PROTECTION} />
      <CardSection id="orgs-h" anchor="wsparcie" icon="heart" tone="rose" title="Organizacje wsparcia" blocks={orgs}
        intro="Lista przykładowa - ZUS nie prowadzi zweryfikowanej listy organizacji." />
      <CardSection id="links-h" anchor="linki" icon="link" tone="navy" title="Gdzie szukać informacji" blocks={links} />
    </div>
  );
}

function SensitiveGuide() {
  const [intro, ...rest] = SENSITIVE;
  const lossOrgs = SUPPORT.filter((b) => b.kind === "SUPPORT_ORG" && (b.situations ?? []).some((s) => ["STILLBIRTH", "MISCARRIAGE", "CHILD_DEATH"].includes(s)));
  return (
    <div className="space-y-8">
      <header className="rounded-3xl bg-zus-blue-50 p-6 sm:p-10">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-rose-600 shadow-sm"><Icon name="heart" className="h-6 w-6" /></span>
        <p className="mt-4 text-xs font-semibold tracking-wider text-zus-navy uppercase">Przewodnik · ścieżka po stracie</p>
        <h1 className="mt-1 text-2xl font-semibold text-zus-navy sm:text-3xl">Wsparcie po stracie dziecka</h1>
        {intro && (
          <div className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-800">
            <p className="font-semibold">{intro.title}</p>
            <Markdown text={intro.body_md} />
          </div>
        )}
        <p className="mt-5 text-sm">
          <Link href="/wsparcie" className="font-medium text-zus-navy underline underline-offset-2">Pokaż pełny przewodnik</Link>
        </p>
      </header>
      {lossOrgs.length > 0 && (
        <section aria-labelledby="loss-orgs-h">
          <SectionHead id="loss-orgs-h" icon="phone" tone="rose" title="Gdzie szukać pomocy" intro="Możesz zadzwonić od razu - rozmowa jest bezpłatna." />
          <div className="grid gap-4 md:grid-cols-2">{lossOrgs.map((b) => <Card key={b.id} block={b} icon="heart" tone="rose" />)}</div>
        </section>
      )}
      {rest.length > 0 && (
        <section aria-labelledby="sens-h">
          <SectionHead id="sens-h" icon="info" tone="blue" title="Najważniejsze" intro="Tylko to, co warto wiedzieć teraz. Bez wyliczeń." />
          <div className="grid gap-4 md:grid-cols-2">{rest.map((b) => <Card key={b.id} block={b} icon="info" tone="blue" />)}</div>
        </section>
      )}
      <details className="group rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold text-zus-navy">
          Pozostałe informacje (na żądanie)
          <span aria-hidden="true" className="text-xl transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="mt-6"><FullSections /></div>
      </details>
    </div>
  );
}

export function Guide({ sensitive = false }: { sensitive?: boolean }) {
  if (sensitive) return <SensitiveGuide />;
  return (
    <div className="space-y-10">
      <header className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-zus-green-50 via-white to-zus-blue-50 p-6 sm:p-10">
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-zus-green-100/60" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-zus-blue-50" />
        <div className="relative">
          <p className="text-xs font-semibold tracking-wider text-zus-green-dark uppercase">Przewodnik</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zus-navy sm:text-4xl">Przewodnik przyszłego rodzica</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-700">
            Wszystko w jednym miejscu: kolejne kroki od ciąży do powrotu do pracy, ryzyka, ochrona pracy w ciąży, organizacje wsparcia i przydatne linki.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-zus-green-dark px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zus-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark">
              Sprawdź, co Ci przysługuje <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <Link href="/wsparcie/po-stracie" className="inline-flex items-center gap-2 rounded-full border border-zus-blue/40 bg-zus-blue-50 px-5 py-2.5 text-sm font-semibold text-zus-navy hover:border-zus-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zus-green-dark">
              <Icon name="heart" className="h-4 w-4 text-rose-600" />
              <span>Poronienie lub strata dziecka - ścieżka po stracie</span>
            </Link>
          </div>
          <nav aria-label="Na tej stronie" className="mt-8">
            <p className="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Na skróty</p>
            <ul className="flex flex-wrap gap-2">
              {NAV.map((n) => <li key={n.href}><a href={n.href} className={chip}><Icon name={n.icon} className="h-4 w-4" />{n.label}</a></li>)}
            </ul>
          </nav>
        </div>
      </header>
      <FullSections />
      <p className="rounded-2xl bg-zus-gray-50 p-4 text-xs text-zinc-600">
        Treści mają charakter informacyjny i nie są decyzją ZUS. Wynik dla Twojej sytuacji - z wyjaśnieniem, jak go policzyliśmy - pokaże kreator.
      </p>
    </div>
  );
}
