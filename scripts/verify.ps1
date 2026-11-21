# Pełna weryfikacja lokalna (Windows / PowerShell): audyt reguł, lint, testy, typy, build.
# Opcja -Smoke: dodatkowo smoke test na uruchomionych serwerach (najpierw scripts\dev.ps1).
# Opcja -E2E: dodatkowo scenariusze użytkownika po polsku (e2e/scenariusze/*.md, Playwright; raz: cd e2e; npm install).
param([switch]$Smoke, [switch]$E2E)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$py = Join-Path $root "backend\.venv\Scripts\python.exe"
$failed = @()

function Invoke-Step($name, [scriptblock]$cmd) {
    Write-Host "== $name" -ForegroundColor Cyan
    & $cmd
    if ($LASTEXITCODE -ne 0) { $script:failed += $name; Write-Host "FAILED: $name" -ForegroundColor Red }
}

Push-Location $root
Invoke-Step "Audyt reguł" { & $py zus_rules\tools\build_catalog.py }
Push-Location backend
Invoke-Step "Backend ruff" { & $py -m ruff check . }
Invoke-Step "Backend pytest" { & $py -m pytest -p no:warnings }
Pop-Location
Push-Location frontend
Invoke-Step "Frontend lint" { npm run lint }
Invoke-Step "Frontend typecheck" { npm run typecheck }
Invoke-Step "Frontend build" { npm run build }
Pop-Location
if ($Smoke) { Invoke-Step "Smoke" { & $py scripts\smoke.py } }
if ($E2E) { Push-Location e2e; Invoke-Step "E2E scenariusze" { npm test }; Pop-Location }
Pop-Location

if ($failed.Count -gt 0) { Write-Host "VERIFY: FAIL ($($failed -join ', '))" -ForegroundColor Red; exit 1 }
Write-Host "VERIFY: PASS" -ForegroundColor Green
