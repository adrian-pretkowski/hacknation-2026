# Uruchomienie lokalne (Windows / PowerShell): backend na :8000, frontend na :3000 w osobnych oknach.
# Pierwsze uruchomienie instaluje zależności. Wymagane: Python 3.12, Node 22+ (npm).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

# Git hook post-commit (znacznik „czeka na review” → komenda /review w Claude Code)
git -C $root config core.hooksPath .githooks

$venvPython = Join-Path $root "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    python -m venv (Join-Path $root "backend\.venv")
    & $venvPython -m pip install -q -r (Join-Path $root "backend\requirements-dev.txt")
}
if (-not (Test-Path (Join-Path $root "frontend\node_modules"))) {
    Push-Location (Join-Path $root "frontend"); npm ci; Pop-Location
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; & '$venvPython' -m uvicorn app.main:app --reload --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev"
Write-Host "Backend:  http://localhost:8000/api/health"
Write-Host "Frontend: http://localhost:3000"
Write-Host "Smoke:    python scripts\smoke.py"
