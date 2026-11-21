// FE1-28: konfiguracja audytu WCAG 2.2 AA (npm run wcag). Bazuje na playwright.config.ts.
import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testMatch: ["wcag-audit.spec.ts"],
  retries: 1,
  projects: [
    { name: "telefon", use: { viewport: { width: 375, height: 812 }, hasTouch: true } },
    { name: "komputer", use: { viewport: { width: 1440, height: 900 } } },
    { name: "reflow320", use: { viewport: { width: 320, height: 640 }, hasTouch: true } },
  ],
});
