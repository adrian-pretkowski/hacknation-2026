# Frontend - Next.js 16

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4, npm. **Przeczytaj `AGENTS.md`** (dokumentacja frameworka w `node_modules/next/dist/docs/` - wersja 16 ma zmiany względem starszych).

## Struktura
```
src/app/              strony (page.tsx = główny przepływ; kolejne: planer/, sprawy/, symulacje/, dokumenty/, wsparcie/, admin/)
src/features/<domena> logika i komponenty domenowe (main-flow, planner, admin - FE-1; simulations, cases, documents, support - FE-2)
src/components/       komponenty wspólne i layout (FE-2)
src/lib/api.ts        jedyny klient API (real / mock); api-types.ts generowany: npm run gen:api - nie edytuj ręcznie
src/lib/format.ts     formatowanie PL (bez przeliczania kwot)
src/mocks/            odpowiedzi z przykładów contracts/openapi.yaml (tryb NEXT_PUBLIC_API_MODE=mock)
src/content/          treści przewodnika (BA)
```

## Zasady
- RWD: sprawdzaj 375, 768, 1440 px; brak poziomego scrolla.
- Ekran symulacji: stały baner „SYMULACJA - w wersji produkcyjnej: integracja z …”; własny design, bez logotypów i kolorów ZUS/mObywatel.
- Dane symulacji pochodzą z backendowych mocków (`/api/sim/*`; kod: `backend/app/integrations/simulated/`, opis: `docs/ARCHITECTURE.md`). Profile demo: `employee_mother`, `self_employed_debt`, `father_takeover`, `voluntary_short_waiting`, `gap_in_insurance`, `twins_employee`, `adoptive_father`. Nieznany profil → 404 problem+json.
- Karta wyniku z kwotą zawsze ma rozwijany blok „Pokaż, jak to policzyliśmy” (`CalcDetails` w `features/main-flow/wizard/Results.tsx`): kroki, dni × stawka, `applied_rules`, założenia, `not_evaluated_rules`. To wyróżnik wskazany przez jury (D19) - nowe ekrany wyników (planer, sprawy) mają go mieć też.
- Tryb mock zawsze z banerem „TRYB DEMO” (`DemoModeBanner`); E2E i demo - tryb `real`.
- Kwoty z API jako string; nie przeliczaj w przeglądarce. Format PL przez `lib/format.ts`.
- Każdy wynik: status, uzasadnienie i podstawa prawna z API; `NEEDS_DATA` → pytanie o pole z `missing_data`; `plan_errors` przy segmencie planera.
- Tryb wrażliwy (martwe urodzenie, poronienie, zgon): spokojny język, wsparcie na górze, kalkulacje na żądanie.
- WCAG 2.1 AA: etykiety, focus, kontrast, aria dla dynamicznych wyników (`aria-live`).
- Weryfikacja: `npm run lint; npm run typecheck; npm run build`.
