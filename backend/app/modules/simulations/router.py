"""Endpointy `/api/sim/*` (INT-03) - cienka warstwa HTTP nad serwisami symulacji. Wszystko SYMULACJA."""
import datetime as dt
from typing import Any, Literal

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.integrations.simulated import SimulatedSystems, UnknownProfileError

router = APIRouter(prefix="/api/sim", tags=["simulations"])
systems = SimulatedSystems()


def not_found(profile_id: str) -> JSONResponse:
    return JSONResponse(status_code=404, media_type="application/problem+json",
                        content={"type": "about:blank", "title": "Nieznany profil", "status": 404,
                                 "detail": f"Brak profilu demo '{profile_id}'.", "errors": []})


class LoginRequest(BaseModel):
    profile_id: str


class PueQuestion(BaseModel):
    profile_id: str
    topic: Literal["MATERNITY", "PARENTAL", "SICKNESS", "DOCUMENTS", "OTHER"]
    question: str = Field(min_length=3, max_length=2000)


class ApplicationRequest(BaseModel):
    profile_id: str
    application_type: Literal["ZAM", "LEAVE_MATERNITY_PRE_BIRTH", "LEAVE_MATERNITY_RESIGNATION",
                              "LEAVE_MATERNITY_TRANSFER", "LEAVE_SUPPLEMENTARY_MATERNITY", "LEAVE_PARENTAL",
                              "LEAVE_PARENTAL_PART_TIME_WORK", "LEAVE_PATERNITY", "LEAVE_MATERNITY_LIKE"]
    recipient: Literal["EMPLOYER", "ZUS"]
    planned_start: dt.date | None = None
    fields: dict[str, Any]
    attachments: list[str] = []


class BirthCertificateRequest(BaseModel):
    birth_date: dt.date
    copy_type: Literal["SHORT", "FULL"]
    delivery: Literal["ELECTRONIC", "REGISTRY_OFFICE_PICKUP"]


@router.post("/mobywatel/login")
def login(body: LoginRequest) -> Any:
    try:
        return systems.mobywatel.login(body.profile_id)
    except UnknownProfileError:
        return not_found(body.profile_id)


@router.get("/zus-profile")
def zus_profile(profile_id: str) -> Any:
    try:
        return systems.zus.get_profile(profile_id)
    except UnknownProfileError:
        return not_found(profile_id)


@router.get("/ezla")
def ezla(profile_id: str) -> Any:
    try:
        return systems.ezla.list_certificates(profile_id)
    except UnknownProfileError:
        return not_found(profile_id)


@router.get("/debt-certificate")
def debt_certificate(profile_id: str, as_of: dt.date) -> Any:
    try:
        return systems.debt.certificate(profile_id, as_of)
    except UnknownProfileError:
        return not_found(profile_id)


@router.post("/pue-question")
def pue_question(body: PueQuestion) -> Any:
    try:
        return systems.pue.ask(body.profile_id, body.topic, body.question)
    except UnknownProfileError:
        return not_found(body.profile_id)


@router.post("/applications")
def applications(body: ApplicationRequest) -> Any:
    try:
        return systems.applications.submit(body.profile_id, body.application_type, body.recipient,
                                           planned_start=body.planned_start, fields=body.fields,
                                           attachments=body.attachments)
    except UnknownProfileError:
        return not_found(body.profile_id)


@router.post("/birth-certificate")
def birth_certificate(body: BirthCertificateRequest) -> Any:
    return systems.civil_registry.request_copy(body.birth_date, body.copy_type, body.delivery)
