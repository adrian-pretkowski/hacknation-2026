from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.params import ruleset_version
from app.modules.admin.router import router as admin_router
from app.modules.cases.router import router as cases_router
from app.modules.evaluation.router import router as evaluation_router
from app.modules.planner.router import router as planner_router
from app.modules.simulations.router import router as simulations_router

settings = get_settings()
app = FastAPI(title="Przewodnik Przyszłego Rodzica - API", version="0.1.0")


def _internal_problem() -> JSONResponse:
    """500 jako application/problem+json - bez szczegółów wyjątku i danych osobowych w treści."""
    return JSONResponse(status_code=500, media_type="application/problem+json",
                        content={"type": "about:blank", "title": "Błąd wewnętrzny", "status": 500,
                                 "detail": "Nie udało się przetworzyć żądania. Spróbuj ponownie lub zmień dane."})


@app.middleware("http")
async def internal_problem_middleware(request: Request, call_next):  # type: ignore[no-untyped-def]
    """Nieobsłużony wyjątek → 500 problem+json wewnątrz CORS (przeglądarka dostaje nagłówki CORS i treść błędu)."""
    try:
        return await call_next(request)
    except Exception:  # noqa: BLE001 - celowo: każdy nieobsłużony wyjątek
        return _internal_problem()


# CORS dodany po middleware błędów = warstwa zewnętrzna, więc obejmuje też odpowiedzi 500
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["GET", "POST", "PUT", "DELETE"],
                   allow_headers=["*"])


@app.exception_handler(RequestValidationError)
async def validation_problem(_: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [{"field": ".".join(str(p) for p in e["loc"] if p != "body"), "code": e["type"], "message": e["msg"]}
              for e in exc.errors()]
    return JSONResponse(status_code=422, media_type="application/problem+json",
                        content={"type": "about:blank", "title": "Niepoprawne dane wejściowe", "status": 422,
                                 "detail": "Żądanie nie spełnia kontraktu.", "errors": errors})


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "ruleset_version": ruleset_version(), "law_reference_date": settings.law_reference_date,
            "engine": "slice-v0" if get_settings().engine == "slice" else "rules-engine",
            "app_version": settings.app_version}


app.include_router(evaluation_router)
app.include_router(simulations_router)
app.include_router(planner_router)
app.include_router(admin_router)  # BE2-05
app.include_router(cases_router)  # BE2-06
