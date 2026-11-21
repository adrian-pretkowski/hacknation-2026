# Wdrożenie na Heroku (INT-12)

Wdrożenie odbywa się **wyłącznie po wypchnięciu tagu** `vX.Y.Z` (workflow `.github/workflows/deploy.yml`). Push na `main` i PR niczego nie wdrażają.

## Układ
Dwie aplikacje Heroku, obie jako kontenery (stack `container`):
- **backend** — obraz z `backend/Dockerfile`, port z `$PORT`;
- **frontend** — obraz z `frontend/Dockerfile`, adres API wpisywany w buildzie (`NEXT_PUBLIC_API_URL`).

Wersja aplikacji = nazwa tagu (`APP_VERSION`); widać ją w stopce i w `GET /api/health` (`app_version`).

## Jednorazowa konfiguracja
Wymagane: konto Heroku, zainstalowane [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) (`heroku login`).

1. Utwórz aplikacje (nazwy muszą być unikalne globalnie, np. z własnym sufiksem):
   ```
   heroku create ppr-backend-<sufiks> --stack container
   heroku create ppr-frontend-<sufiks> --stack container
   ```
2. Klucz API dla GitHuba (token ważny długo, tylko do deployu):
   ```
   heroku authorizations:create --description "github-actions deploy" --expires-in 31536000
   ```
   Skopiuj wartość pola `Token`.
3. W repozytorium GitHub → **Settings → Secrets and variables → Actions**:
   - zakładka **Secrets**: `HEROKU_API_KEY` = token z kroku 2;
   - zakładka **Variables**: `HEROKU_APP_BACKEND` = nazwa aplikacji backendu, `HEROKU_APP_FRONTEND` = nazwa aplikacji frontendu.
4. Nic więcej: CORS backendu (`CORS_ORIGINS`) ustawia sam workflow na adres frontendu.

Dopóki zmienne z kroku 3 nie istnieją, job `deploy` jest pomijany (tag przechodzi walidację i build, ale nic nie wdraża).

## Wydanie
```
git switch main && git pull
git tag v0.1.0
git push origin v0.1.0
```
Workflow: sprawdza format tagu i że commit jest na `main` → ponownie uruchamia CI → buduje obrazy → wdraża backend, potem frontend → weryfikuje, że `/api/health` zwraca `app_version` równe tagowi.

## Uwagi
- Obrazy zawierają wyłącznie dane syntetyczne; `cases/` i `materials/` są poza gitem i poza obrazami.
- Dyski Heroku są nietrwałe — nie zapisuj na nich stanu (panel admina na razie trzyma parametry w pamięci/plikach z repo).
- Cofnięcie wydania: `heroku releases:rollback -a <aplikacja>` albo wypchnięcie nowego tagu.
