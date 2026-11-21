// Interpreter kroków scenariuszy pisanych po polsku. Każdy krok to jedno zdanie z wartościami w cudzysłowie:
//   „Kliknij „Zaczynamy””, „Wybierz „Mamą””, „W polu „Planowana data porodu” wpisz „za 60 dni””.
// Słownik kroków: e2e/README.md (generowany ręcznie z listy KROKI poniżej - przy nowym kroku dopisz go tam).
import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

export type Kontekst = { page: Page; info: TestInfo };
type Krok = { wzorce: RegExp[]; opis: string; wykonaj: (k: Kontekst, ...args: string[]) => Promise<void> };

const TIMEOUT = 7_000;
// Wartość w cudzysłowie: „…”, "…", “…” albo '…'.
const Q = String.raw`[„"“”'‚]([^„"“”'‚’]+)[”"“'’]`;
// Grupy „(a|b)” we wzorcu to tylko warianty słów; argumentami kroku są wyłącznie «Q» (wartość w cudzysłowie), «N» (liczba), «STAN», «NIE» (opcjonalne „nie”).
const re = (s: string) => new RegExp(`^${s.replace(/\((?!\?)/g, "(?:").replace(/«Q»/g, Q).replace(/«N»/g, String.raw`(\d+)`).replace(/«STAN»/g, "(nieaktywny|aktywny)").replace(/«NIE»/g, "(nie )?")}$`, "i");
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const zawiera = (s: string) => new RegExp(esc(s.trim()), "i");

// ---------- daty ----------
const MIESIACE = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const JEDNOSTKA: Record<string, number> = { dzień: 1, dni: 1, dnia: 1, tydzień: 7, tygodnie: 7, tygodni: 7, tygodnia: 7 };

/** Zamienia datę zapisaną po ludzku na RRRR-MM-DD. Obsługuje: 2026-12-01, 01.12.2026, 1 grudnia 2026, dziś, za 60 dni, 3 tygodnie temu. */
export function data(tekst: string): string {
  const t = tekst.trim().toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  let m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2}) (\p{L}+) (\d{4})$/u);
  if (m && MIESIACE.includes(m[2])) return `${m[3]}-${String(MIESIACE.indexOf(m[2]) + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const dzis = new Date();
  if (t === "dziś" || t === "dzisiaj") return iso(dzis);
  const przesun = (n: number) => { const d = new Date(dzis); d.setDate(d.getDate() + n); return iso(d); };
  m = t.match(/^za (\d+) (\p{L}+)$/u);
  if (m && JEDNOSTKA[m[2]]) return przesun(Number(m[1]) * JEDNOSTKA[m[2]]);
  m = t.match(/^(\d+) (\p{L}+) temu$/u);
  if (m && JEDNOSTKA[m[2]]) return przesun(-Number(m[1]) * JEDNOSTKA[m[2]]);
  throw new Error(`Nie rozumiem daty „${tekst}”. Użyj np. 2026-12-01, 01.12.2026, 1 grudnia 2026, dziś, za 60 dni, 3 tygodnie temu.`);
}

// ---------- wyszukiwanie elementów ----------
/** Otwarte okno (symulowane logowanie, konto) blokuje resztę strony - wtedy szukamy w nim. */
async function obszar(page: Page): Promise<Page | Locator> {
  const dlg = page.locator("dialog[open]");
  return (await dlg.count()) > 0 ? dlg.last() : page;
}

/** Czeka, aż któryś z kandydatów (w podanej kolejności) będzie widoczny, i zwraca pierwszy pasujący. */
async function znajdz(page: Page, opis: string, kandydaci: (s: Page | Locator) => Locator[]): Promise<Locator> {
  const koniec = Date.now() + TIMEOUT;
  for (;;) {
    const s = await obszar(page);
    for (const c of kandydaci(s)) {
      const widoczne = c.filter({ visible: true });
      if ((await widoczne.count()) > 0) return widoczne.first();
    }
    if (Date.now() > koniec) throw new Error(`Nie znaleziono na ekranie: ${opis}`);
    await page.waitForTimeout(150);
  }
}

const klikalne = (t: string) => (s: Page | Locator) => [
  s.getByRole("button", { name: t, exact: true }),
  s.getByRole("link", { name: t, exact: true }),
  s.getByRole("button", { name: zawiera(t) }),
  s.getByRole("link", { name: zawiera(t) }),
  s.getByRole("tab", { name: zawiera(t) }),
  s.getByRole("radio", { name: t, exact: true }),
  s.getByText(t, { exact: true }),
  s.getByText(t),
];

const pole = (t: string) => (s: Page | Locator) => [
  s.getByLabel(t, { exact: true }).and(s.locator(":not([type=range])")),
  s.getByLabel(zawiera(t)).and(s.locator(":not([type=range])")),
];

async function kliknij({ page }: Kontekst, t: string) {
  const el = await znajdz(page, `przycisk lub tekst „${t}”`, klikalne(t));
  await el.click();
}

async function wybierz({ page }: Kontekst, t: string) {
  const el = await znajdz(page, `opcja „${t}”`, (s) => [
    s.getByRole("radio", { name: t, exact: true }),
    s.getByRole("radio", { name: zawiera(t) }),
    s.getByRole("checkbox", { name: zawiera(t) }),
    s.locator("label").filter({ hasText: zawiera(t) }),
    s.getByRole("tab", { name: zawiera(t) }),
    s.getByRole("button", { name: zawiera(t) }),
  ]);
  const rola = await el.getAttribute("type");
  if (rola === "radio" || rola === "checkbox") await el.check();
  else await el.click();
}

async function wpisz({ page }: Kontekst, etykieta: string, wartosc: string) {
  const el = await znajdz(page, `pole „${etykieta}”`, pole(etykieta));
  const typ = await el.getAttribute("type");
  await el.fill(typ === "date" ? data(wartosc) : wartosc);
}

async function zLisy({ page }: Kontekst, etykieta: string, opcja: string) {
  const el = await znajdz(page, `lista „${etykieta}”`, (s) => [s.getByRole("combobox", { name: etykieta, exact: true }), s.getByRole("combobox", { name: zawiera(etykieta) })]);
  const etykiety = await el.locator("option").allTextContents();
  const pasujaca = etykiety.find((e) => e.trim().toLowerCase() === opcja.toLowerCase())
    ?? etykiety.find((e) => e.toLowerCase().includes(opcja.toLowerCase()));
  if (!pasujaca) throw new Error(`Lista „${etykieta}” nie ma opcji „${opcja}”. Dostępne: ${etykiety.map((e) => `„${e.trim()}”`).join(", ")}`);
  await el.selectOption({ label: pasujaca });
}

async function zalogujJako(k: Kontekst, osoba: string) {
  const { page } = k;
  if ((await page.locator("dialog[open]").count()) === 0) {
    await page.locator("header").getByRole("button", { name: /Zaloguj się/ }).click();
  }
  await expect(page.getByRole("heading", { name: /Logowanie aplikacją/ })).toBeVisible();
  await zeskanuj(k, osoba);
  await potwierdzWTelefonie(k);
  await expect(page.getByText(`Zalogowano jako ${osoba}`).first()).toBeVisible();
  await expect(page.locator("dialog[open]")).toHaveCount(0, { timeout: TIMEOUT });
}

async function zeskanuj({ page }: Kontekst, osoba: string) {
  const telefon = page.getByRole("region", { name: /Symulowany telefon/ });
  await telefon.getByRole("button", { name: zawiera(osoba) }).click();
  await expect(page.getByText("Kod zeskanowany")).toBeVisible();
}

async function potwierdzWTelefonie({ page }: Kontekst) {
  await page.getByRole("region", { name: /prośba o potwierdzenie/ }).getByRole("button", { name: "Potwierdź" }).click();
}

// ---------- słownik kroków ----------
export const KROKI: Krok[] = [
  // nawigacja
  { opis: "Otwórz stronę główną", wzorce: [re("otwórz (stronę główną|aplikację|przewodnik)"), re("wejdź na stronę główną")],
    wykonaj: async ({ page }) => { await page.goto("/"); } },
  { opis: "Otwórz stronę „/admin”", wzorce: [re("otwórz stronę «Q»")], wykonaj: async ({ page }, u) => { await page.goto(u); } },
  { opis: "Cofnij w przeglądarce", wzorce: [re("(cofnij|wróć) (w przeglądarce|przyciskiem przeglądarki)"), re("naciśnij wstecz w przeglądarce")],
    wykonaj: async ({ page }) => { await page.goBack(); } },
  { opis: "Odśwież stronę", wzorce: [re("odśwież stronę")], wykonaj: async ({ page }) => { await page.reload(); } },

  // logowanie (SYMULACJA)
  { opis: "Zaloguj się przez mObywatel jako „Anna Przykładowa”", wzorce: [re("zaloguj się( przez mobywatel| kodem qr)? jako «Q»")], wykonaj: zalogujJako },
  { opis: "Zeskanuj kod QR jako „Anna Przykładowa”", wzorce: [re("zeskanuj kod( qr)? jako «Q»")], wykonaj: zeskanuj },
  { opis: "Potwierdź logowanie w telefonie", wzorce: [re("potwierdź( logowanie)? w telefonie")], wykonaj: potwierdzWTelefonie },
  { opis: "Odrzuć logowanie w telefonie", wzorce: [re("odrzuć( logowanie)? w telefonie")],
    wykonaj: async ({ page }) => { await page.getByRole("region", { name: /prośba o potwierdzenie/ }).getByRole("button", { name: "Odrzuć" }).click(); } },

  // formularz
  { opis: "Z listy „Ile dzieci przy jednym porodzie?” wybierz „2”", wzorce: [re("z listy «Q» wybierz «Q»")], wykonaj: zLisy },
  { opis: "Wybierz „2” z listy „Ile dzieci przy jednym porodzie?”", wzorce: [re("wybierz «Q» z listy «Q»")],
    wykonaj: (k, opcja, etykieta) => zLisy(k, etykieta, opcja) },
  { opis: "W polu „Planowana data porodu” wpisz „za 60 dni”", wzorce: [re("w pol(u|e) «Q» wpisz «Q»")], wykonaj: wpisz },
  { opis: "Wpisz „7800” w pole „Wynagrodzenie brutto”", wzorce: [re("wpisz «Q» (w|do) pol(e|a) «Q»")],
    wykonaj: (k, w, e) => wpisz(k, e, w) },
  { opis: "Ustaw suwak „Ile tygodni rodzicielskiego weźmie tata?” na „9”", wzorce: [re("ustaw suwak «Q» na «Q»")],
    wykonaj: (k, e, w) => wpisz(k, `${e} - wpisz wartość`, w) },
  { opis: "Wybierz „Mamą”  (opcja, pole wyboru albo zakładka)", wzorce: [re("wybierz( opcję)? «Q»")], wykonaj: wybierz },
  { opis: "Zaznacz „Wcześniak”  (pole wyboru; wystarczy początek etykiety)",wzorce: [re("zaznacz «Q»")],
    wykonaj: async ({ page }, t) => { await (await znajdz(page, `pole wyboru „${t}”`, (s) => [s.getByRole("checkbox", { name: zawiera(t) })])).check(); } },
  { opis: "Odznacz „Wcześniak”", wzorce: [re("odznacz «Q»")],
    wykonaj: async ({ page }, t) => { await (await znajdz(page, `pole wyboru „${t}”`, (s) => [s.getByRole("checkbox", { name: zawiera(t) })])).uncheck(); } },
  { opis: "Przejdź dalej  (= „Dalej →” albo „Pokaż plan →”)", wzorce: [re("przejdź dalej"), re("kliknij dalej")],
    wykonaj: async ({ page }) => { await (await znajdz(page, "przycisk „Dalej” / „Pokaż plan”", (s) => [s.getByRole("button", { name: /^(Dalej|Pokaż plan)/ })])).click(); } },
  { opis: "Kliknij „Zaczynamy”  (przycisk, link, zakładka albo tekst)", wzorce: [re("(kliknij|naciśnij|wciśnij) «Q»"), re("kliknij w «Q»")], wykonaj: kliknij },
  { opis: "Naciśnij klawisz „Escape”", wzorce: [re("naciśnij klawisz «Q»")], wykonaj: async ({ page }, kl) => { await page.keyboard.press(kl); } },
  { opis: "Poczekaj 2 sekundy", wzorce: [re("poczekaj «N» sekund[ęy]?")], wykonaj: async ({ page }, n) => { await page.waitForTimeout(Number(n) * 1000); } },

  // sprawdzenia
  { opis: "Sprawdź, że nagłówek to „Twój plan”", wzorce: [re("sprawdź, że nagłówek (to|brzmi) «Q»")],
    wykonaj: async ({ page }, t) => { await expect(page.getByRole("heading", { name: t, exact: true }).filter({ visible: true }).first()).toBeVisible(); } },
  { opis: "Sprawdź, że nie widać „Nie przysługuje”", wzorce: [re("sprawdź, że nie (widać|ma) «Q»"), re("nie powin(no|ien|na) być widać «Q»")],
    wykonaj: async ({ page }, t) => { await expect(page.getByText(t).filter({ visible: true })).toHaveCount(0); } },
  { opis: "Sprawdź, że widać „Przysługuje”", wzorce: [re("sprawdź, że (widać|jest|na ekranie jest) «Q»"), re("powin(no|ien|na) być widać «Q»"), re("widzę «Q»")],
    wykonaj: async ({ page }, t) => { await expect(page.getByText(t).filter({ visible: true }).first()).toBeVisible(); } },
  { opis: "Sprawdź, że przycisk „Dalej” jest nieaktywny / że przycisk „Pokaż wynik teraz” jest aktywny", wzorce: [re("sprawdź, że przycisk «Q» jest «STAN»")],
    wykonaj: async ({ page }, t, stan) => {
      const b = (await obszar(page)).getByRole("button", { name: zawiera(t) }).filter({ visible: true }).first();
      await (stan.toLowerCase() === "aktywny" ? expect(b).toBeEnabled() : expect(b).toBeDisabled());
    } },
  { opis: "Sprawdź, że nie można przejść dalej / że można przejść dalej", wzorce: [re("sprawdź, że «NIE»można przejść dalej")],
    wykonaj: async ({ page }, nie) => {
      const b = page.getByRole("button", { name: /^(Dalej|Pokaż plan)/ }).filter({ visible: true }).first();
      await (nie ? expect(b).toBeDisabled() : expect(b).toBeEnabled());
    } },
  { opis: "Sprawdź, że pole „Od kiedy podlegasz ubezpieczeniu chorobowemu?” ma wartość „2019-03-01”", wzorce: [re("sprawdź, że pole «Q» ma wartość «Q»")],
    wykonaj: async ({ page }, e, w) => {
      const el = await znajdz(page, `pole „${e}”`, pole(e));
      await expect(el).toHaveValue((await el.getAttribute("type")) === "date" ? data(w) : w);
    } },
  { opis: "Sprawdź, że jestem zalogowany jako „Anna Przykładowa”", wzorce: [re("sprawdź, że jestem zalogowan[ya] jako «Q»")],
    wykonaj: async ({ page }, o) => { await expect(page.locator("header").getByRole("button", { name: zawiera(`Konto testowe: ${o}`) })).toBeVisible(); } },
  { opis: "Sprawdź, że widać baner „SYMULACJA”", wzorce: [re("sprawdź, że widać baner «Q»")],
    wykonaj: async ({ page }, t) => { await expect(page.getByText(t).filter({ visible: true }).first()).toBeVisible(); } },
  { opis: "Sprawdź, że strona nie przewija się w poziomie", wzorce: [re("sprawdź, że strona nie przewija się (w poziomie|na boki)")],
    wykonaj: async ({ page }) => {
      const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(sw, `szerokość treści ${sw}px > szerokość okna ${iw}px`).toBeLessThanOrEqual(iw);
    } },
  { opis: "Zrób zrzut ekranu „wynik-mama”", wzorce: [re("zrób zrzut ekranu «Q»")],
    wykonaj: async ({ page, info }, n) => {
      await info.attach(n, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    } },
];

const bezKropki = (s: string) => s.trim().replace(/[.;]\s*$/, "").trim();

export function dopasuj(tekst: string): { krok: Krok; args: string[] } | null {
  const t = bezKropki(tekst);
  for (const krok of KROKI) {
    for (const w of krok.wzorce) {
      const m = t.match(w);
      if (m) return { krok, args: m.slice(1) };
    }
  }
  return null;
}

export function niezrozumialy(tekst: string): Error {
  return new Error(`Nie rozumiem kroku: „${bezKropki(tekst)}”.\nObsługiwane kroki:\n${KROKI.map((k) => `  • ${k.opis}`).join("\n")}`);
}
