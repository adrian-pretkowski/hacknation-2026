"""Sprawy (BE2-06): GET /api/cases, GET /api/cases/{id}, POST /api/cases/{id}/evaluate, POST /api/cases/upload.

Upload ``multipart/form-data`` (pole ``file``) parsowany biblioteką standardową (``email``) — bez nowej zależności
(python-multipart). Plik tylko w pamięci: nie jest zapisywany ani logowany (poufność, kontrakt uploadCase).
"""
from __future__ import annotations

from email.parser import BytesParser
from email.policy import HTTP
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.modules.cases import service

router = APIRouter(prefix="/api/cases", tags=["cases"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # techniczny limit rozmiaru pliku (nie wartość prawna)


def _problem(status: int, title: str, detail: str, field: str | None = None) -> JSONResponse:
    body: dict[str, Any] = {"type": "about:blank", "title": title, "status": status, "detail": detail}
    if field:
        body["errors"] = [{"field": field, "code": title.lower().replace(" ", "_"), "message": detail}]
    return JSONResponse(status_code=status, media_type="application/problem+json", content=body)


def _not_found(case_id: str) -> JSONResponse:
    return _problem(404, "Brak sprawy", f"Nie ma sprawy {case_id!r}.")


@router.get("")
def list_cases() -> dict[str, Any]:
    return service.list_cases()


@router.post("/upload")
async def upload_case(request: Request) -> Any:
    content_type = request.headers.get("content-type", "")
    if not content_type.startswith("multipart/form-data"):
        return _problem(415, "Nieobsługiwany typ pliku", "Wyślij plik PDF jako multipart/form-data (pole file).",
                        "file")
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_UPLOAD_BYTES + 64 * 1024:
        return _problem(413, "Plik za duży", f"Maksymalnie {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.", "file")
    chunks, size = [], 0
    async for chunk in request.stream():  # licznik bajtów także bez Content-Length (chunked)
        size += len(chunk)
        if size > MAX_UPLOAD_BYTES + 64 * 1024:
            return _problem(413, "Plik za duży", f"Maksymalnie {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.", "file")
        chunks.append(chunk)
    body = b"".join(chunks)
    message = BytesParser(policy=HTTP).parsebytes(b"Content-Type: " + content_type.encode() + b"\r\n\r\n" + body)
    part = next((p for p in message.iter_parts() if p.get_param("name", header="content-disposition") == "file"),
                None) if message.is_multipart() else None
    if part is None:
        return _problem(415, "Nieobsługiwany typ pliku", "Brak pola file z plikiem PDF.", "file")
    content = part.get_payload(decode=True) or b""
    if len(content) > MAX_UPLOAD_BYTES:
        return _problem(413, "Plik za duży", f"Maksymalnie {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.", "file")
    if not content.startswith(b"%PDF-"):
        return _problem(415, "Nieobsługiwany typ pliku", "Obsługiwane są tylko pliki PDF.", "file")
    return service.upload(content)


@router.get("/{case_id}")
def get_case(case_id: str) -> Any:
    try:
        return service.get_case(case_id)
    except service.CaseNotFound:
        return _not_found(case_id)


@router.post("/{case_id}/evaluate")
def evaluate_case(case_id: str) -> Any:
    try:
        return service.evaluate_case(case_id)
    except service.CaseNotFound:
        return _not_found(case_id)
