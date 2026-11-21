"""Panel admina parametrów (BE2-05): GET/PUT /api/admin/parameters (kontrakt: ParameterList, ParameterUpdate).

Dostęp bez uwierzytelnienia (D: demo — wejście bezpośrednio z przycisku „Panel admina” na stronie głównej);
produkcyjnie: SSO. Zmiana działa bez restartu — silnik czyta ``app.core.params.param()`` przy każdej ewaluacji.
Logi bez wartości.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.core.params import STORE, ParameterError, VersionConflict, parameter_list

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _problem(status: int, title: str, detail: str, errors: list[dict[str, str]] | None = None) -> JSONResponse:
    body: dict[str, Any] = {"type": "about:blank", "title": title, "status": status, "detail": detail}
    if errors:
        body["errors"] = errors
    return JSONResponse(status_code=status, media_type="application/problem+json", content=body)


@router.get("/parameters")
def list_parameters() -> Any:
    return parameter_list()


@router.put("/parameters")
async def update_parameters(request: Request) -> Any:
    try:
        body = await request.json()
    except ValueError:
        return _problem(422, "Niepoprawne dane wejściowe", "Treść żądania musi być JSON-em.")
    base = body.get("base_parameters_version") if isinstance(body, dict) else None
    changes = body.get("changes") if isinstance(body, dict) else None
    if isinstance(base, bool) or not isinstance(base, int) or base < 1:
        return _problem(422, "Niepoprawne dane wejściowe", "Żądanie nie spełnia kontraktu.",
                        [{"field": "base_parameters_version", "code": "required", "message": "Liczba całkowita ≥ 1"}])
    if not isinstance(changes, list) or not changes or not all(isinstance(c, dict) for c in changes):
        return _problem(422, "Niepoprawne dane wejściowe", "Żądanie nie spełnia kontraktu.",
                        [{"field": "changes", "code": "required", "message": "Co najmniej jedna zmiana"}])
    try:
        STORE.apply(base, changes)
    except VersionConflict as exc:
        return _problem(409, "Konflikt wersji parametrów",
                        f"Zmiana oparta na wersji {base}, bieżąca wersja to {exc.current} — odśwież listę.")
    except ParameterError as exc:
        return _problem(422, "Nieznany parametr lub zła wartość", exc.message,
                        [{"field": exc.field, "code": exc.code, "message": exc.message}])
    return parameter_list()
