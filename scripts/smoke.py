"""Smoke test głównego przepływu na działających serwerach (bez zależności poza stdlib).

Użycie:  python scripts/smoke.py [--api http://localhost:8000] [--web http://localhost:3000]
Sprawdza: /api/health, POST /api/evaluate na scenariuszu demo (dane syntetyczne) z oczekiwanymi kwotami,
nagłówek CORS dla frontendu oraz że frontend serwuje stronę główną.
"""
import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
EXPECTED = {"status": "ELIGIBLE", "rate": "0.815", "days": 140, "daily_amount_exact": "163",
            "total_amount_exact": "22820"}


def request(url: str, data: dict | None = None, origin: str | None = None) -> tuple[int, dict[str, str], bytes]:
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method="POST" if body else "GET")
    if body:
        req.add_header("Content-Type", "application/json")
    if origin:
        req.add_header("Origin", origin)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status, dict(resp.headers), resp.read()


def wait_until_up(url: str, seconds: int) -> None:
    deadline = time.monotonic() + seconds
    while True:
        try:
            request(url)
            return
        except OSError:
            if time.monotonic() > deadline:
                raise
            time.sleep(1)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default="http://localhost:8000")
    parser.add_argument("--web", default="http://localhost:3000")
    parser.add_argument("--wait", type=int, default=0, help="sekundy oczekiwania na start serwerów (np. Docker)")
    args = parser.parse_args()
    failures = []
    if args.wait:
        wait_until_up(f"{args.api}/api/health", args.wait)
        wait_until_up(args.web, args.wait)

    status, _, body = request(f"{args.api}/api/health")
    health = json.loads(body)
    print(f"[health] {status} {health}")
    if status != 200 or health.get("status") != "ok":
        failures.append("health")

    scenario = json.loads((REPO / "demo" / "scenario_employee_mother.json").read_text(encoding="utf-8"))
    status, headers, body = request(f"{args.api}/api/evaluate", scenario, origin=args.web)
    benefit = json.loads(body)["benefits"][0]
    got = {k: benefit.get(k) for k in EXPECTED}
    print(f"[evaluate] {status} {got}")
    if got != EXPECTED:
        failures.append(f"evaluate: expected {EXPECTED}")
    if headers.get("access-control-allow-origin") != args.web:
        failures.append(f"CORS: brak Access-Control-Allow-Origin dla {args.web}")

    status, _, html = request(args.web)
    ok = status == 200 and "Przewodnik Przyszłego Rodzica" in html.decode("utf-8", "replace")
    print(f"[web] {status} {'strona główna OK' if ok else 'brak oczekiwanej treści'}")
    if not ok:
        failures.append("web")

    print("SMOKE: PASS" if not failures else f"SMOKE: FAIL {failures}")
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
