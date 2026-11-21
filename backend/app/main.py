from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.params import ruleset_version
from app.modules.evaluation.router import router as evaluation_router
from app.modules.simulations.router import router as simulations_router

settings = get_settings()
app = FastAPI(title="Przewodnik Przyszłego Rodzica — API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["GET", "POST", "PUT"],
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
            "engine": "slice-v0" if get_settings().engine == "slice" else "rules-engine"}


app.include_router(evaluation_router)
app.include_router(simulations_router)
