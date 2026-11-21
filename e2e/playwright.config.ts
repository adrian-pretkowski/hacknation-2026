// Scenariusze E2E pisane po polsku (e2e/scenariusze/*.md) wykonywane przez Playwright.
// Domyślnie korzysta z już uruchomionego frontendu (scripts\dev.ps1, :3000); jeśli go nie ma — uruchamia `npm run dev`.
// Inny adres: $env:E2E_BASE_URL = "https://..." (wtedy serwer nie jest uruchamiany).
import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
// Przeglądarka zainstalowana w systemie (bez pobierania): chrome | msedge | chromium (po `npx playwright install chromium`).
const channel = process.env.E2E_BROWSER ?? "chrome";

export default defineConfig({
  testDir: ".",
  testMatch: ["slownik.spec.ts", "scenariusze.spec.ts"],
  timeout: 60_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  // Serwer deweloperski przeładowuje stronę po każdej zapisanej zmianie w kodzie (Fast Refresh) — jedna powtórka chroni przed fałszywym błędem.
  retries: 1,
  workers: process.env.CI ? 2 : 3,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
    channel: channel === "chromium" ? undefined : channel,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "telefon", use: { viewport: { width: 375, height: 812 }, isMobile: false, hasTouch: true } },
    { name: "komputer", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: "npm run dev",
    cwd: "../frontend",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
