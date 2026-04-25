from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, Role
from app.schemas.jobs import JobCreateRequest, JobOut, JobListOut
from app.schemas.quotes import QuoteCreateRequest, QuoteOut, QuoteListOut
from app.services import jobs as jobs_svc, quotes as quotes_svc

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("", response_model=JobOut, status_code=201)
async def create_job(
    body: JobCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    return await jobs_svc.create_job(db, current_user, body.model_dump())


@router.get("", response_model=JobListOut)
def list_jobs(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return jobs_svc.list_jobs(db, current_user, status, page, per_page)


@router.get("/{job_id}", response_model=JobOut)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return jobs_svc.get_job(db, job_id)


@router.delete("/{job_id}", status_code=204)
def cancel_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs_svc.cancel_job(db, job_id, current_user)


@router.post("/{job_id}/quotes", response_model=QuoteOut, status_code=201)
def submit_quote(
    job_id: str,
    body: QuoteCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    return quotes_svc.submit_quote(db, job_id, current_user, body.price)


@router.get("/{job_id}/quotes", response_model=QuoteListOut)
def list_quotes(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return quotes_svc.list_quotes(db, job_id, current_user)


@router.patch("/{job_id}/quotes/{quote_id}/select", response_model=QuoteOut)
def select_quote(
    job_id: str,
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    return quotes_svc.select_quote(db, job_id, quote_id, current_user)


@router.delete("/{job_id}/quotes/{quote_id}", status_code=204)
def withdraw_quote(
    job_id: str,
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    quotes_svc.withdraw_quote(db, quote_id, current_user)
