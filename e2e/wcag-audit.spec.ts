// FE1-28: automatyczny audyt WCAG 2.2 AA (axe-core) po każdym kroku scenariuszy e2e/scenariusze/*.md.
// Uruchomienie: cd e2e; npm run wcag  (telefon 375 px, komputer 1440 px, reflow 320 px = powiększenie 400%, WCAG 1.4.10).
// Test nie przechodzi przy naruszeniu reguł WCAG A/AA (2.0, 2.1, 2.2) ani przy poziomym przewijaniu.
// Zalecenia „best-practice” trafiają tylko do raportu (test-results/wcag/*.json).
// axe-core jest już w frontend/node_modules (zależność eslint-plugin-jsx-a11y) - bez nowych pakietów.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { dopasuj } from "./kroki";

const AXE = readFileSync(join(__dirname, "../frontend/node_modules/axe-core/axe.min.js"), "utf-8");
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const OUT = join(__dirname, "test-results", "wcag");
const KATALOG = join(__dirname, "scenariusze");
mkdirSync(OUT, { recursive: true });

type Naruszenie = { regula: string; wplyw: string; opis: string; tagi: string[]; element: string; html: string; szczegoly: string; krok: string };

async function audyt(page: Page, krok: string, wynik: Map<string, Naruszenie>, uwagi: Map<string, Naruszenie>, przewijanie: string[]) {
  await page.waitForTimeout(250);
  if (!(await page.evaluate(() => "axe" in window))) await page.addScriptTag({ content: AXE });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = await page.evaluate((tagi) => (window as any).axe.run(document, { runOnly: { type: "tag", values: [...tagi, "best-practice"] }, resultTypes: ["violations"] }), WCAG);
  for (const v of res.violations) {
    const cel = v.tags.some((t: string) => WCAG.includes(t)) ? wynik : uwagi;
    for (const n of v.nodes) {
      const klucz = v.id + "|" + n.target.join(" ");
      if (!cel.has(klucz)) cel.set(klucz, { regula: v.id, wplyw: v.impact, opis: v.help, tagi: v.tags.filter((t: string) => t.startsWith("wcag")),
        element: n.target.join(" "), html: n.html.slice(0, 200), szczegoly: (n.failureSummary ?? "").slice(0, 300), krok });
    }
  }
  const s = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (s > 1) przewijanie.push(`${krok}: +${s} px`);
}

for (const plik of readdirSync(KATALOG).filter((f) => f.endsWith(".md")).sort()) {
  test(`WCAG 2.2 AA: ${plik.replace(/\.md$/, "")}`, async ({ page }, info) => {
    const linie = readFileSync(join(KATALOG, plik), "utf-8").split(/\r?\n/);
    const widok = linie.map((l) => l.match(/^widok:\s*(\S+)/i)?.[1].toLowerCase()).find(Boolean) ?? null;
    // reflow 320 px liczymy jak telefon
    const projekt = info.project.name === "reflow320" ? "telefon" : info.project.name;
    test.skip(!!widok && widok !== projekt, `scenariusz tylko dla widoku: ${widok}`);
    const kroki = linie.flatMap((l) => { const m = l.match(/^\s*(\d+)[.)]\s+(.+)$/); return m ? [{ nr: m[1], tekst: m[2].trim() }] : []; });
    const wynik = new Map<string, Naruszenie>(), uwagi = new Map<string, Naruszenie>(), przewijanie: string[] = [];
    for (const k of kroki) {
      const d = dopasuj(k.tekst);
      if (!d) throw new Error(`Nieznany krok: ${k.nr}. ${k.tekst}`);
      await test.step(`${k.nr}. ${k.tekst}`, () => d.krok.wykonaj({ page, info }, ...d.args));
      // „Sprawdź…” nie zmienia ekranu - audyt tylko po krokach, które coś robią (i na końcu)
      if (/^sprawdź/i.test(k.tekst) && k !== kroki[kroki.length - 1]) continue;
      await audyt(page, `${k.nr}. ${k.tekst}`, wynik, uwagi, przewijanie);
    }
    const raport = { naruszenia: [...wynik.values()], zalecenia: [...uwagi.values()], przewijanie };
    writeFileSync(join(OUT, `${info.project.name}__${plik}.json`), JSON.stringify(raport, null, 1));
    expect(raport.naruszenia.map((n) => `${n.regula} (${n.tagi.join(",")}) ${n.element} @ ${n.krok}: ${n.szczegoly}`), "naruszenia WCAG 2.2 A/AA").toEqual([]);
    expect(przewijanie, "poziome przewijanie (WCAG 1.4.10)").toEqual([]);
  });
}
