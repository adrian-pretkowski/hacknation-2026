// Każdy plik e2e/scenariusze/*.md to jeden scenariusz użytkownika:
//   # Tytuł scenariusza
//   Widok: telefon            (opcjonalnie: telefon | komputer — domyślnie oba)
//   > komentarz (pomijany)
//   1. Otwórz stronę główną.
//   2. Kliknij „Zaczynamy”.
// Kroki to linie zaczynające się od numeru. Pozostałe linie są opisem dla ludzi.
// Wybrane scenariusze: npx playwright test -g "mama" (fragment tytułu).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "@playwright/test";
import { dopasuj, niezrozumialy } from "./kroki";

type Scenariusz = { plik: string; tytul: string; widok: string | null; kroki: { nr: string; tekst: string }[] };

const KATALOG = join(__dirname, "scenariusze");

function wczytaj(plik: string): Scenariusz {
  const linie = readFileSync(join(KATALOG, plik), "utf-8").split(/\r?\n/);
  const tytul = linie.find((l) => l.startsWith("# "))?.slice(2).trim() ?? plik;
  const widok = linie.map((l) => l.match(/^widok:\s*(\S+)/i)?.[1].toLowerCase()).find(Boolean) ?? null;
  const kroki = linie.flatMap((l) => {
    const m = l.match(/^\s*(\d+)[.)]\s+(.+)$/);
    return m ? [{ nr: m[1], tekst: m[2].trim() }] : [];
  });
  return { plik, tytul, widok, kroki };
}

const scenariusze = readdirSync(KATALOG).filter((f) => f.endsWith(".md")).sort().map(wczytaj);

for (const s of scenariusze) {
  test(`${s.plik.replace(/\.md$/, "")}: ${s.tytul}`, async ({ page }, info) => {
    test.skip(!!s.widok && s.widok !== info.project.name, `scenariusz tylko dla widoku: ${s.widok}`);
    // Najpierw sprawdzamy cały scenariusz, żeby literówka w kroku 12 nie wyszła dopiero po minucie.
    const plan = s.kroki.map((k) => ({ ...k, dop: dopasuj(k.tekst) }));
    const zly = plan.find((k) => !k.dop);
    if (zly) throw niezrozumialy(`${zly.nr}. ${zly.tekst}`);
    if (plan.length === 0) throw new Error(`Scenariusz ${s.plik} nie ma żadnych kroków (linie „1. …”).`);

    for (const k of plan) {
      await test.step(`${k.nr}. ${k.tekst}`, () => k.dop!.krok.wykonaj({ page, info }, ...k.dop!.args));
    }
  });
}
