from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, Role
from app.models.quote import Quote
from app.schemas.jobs import JobCreateRequest, JobUpdateRequest, JobOut, JobListOut
from app.schemas.quotes import QuoteCreateRequest, QuoteOut, QuoteListOut
from app.services import jobs as jobs_svc, quotes as quotes_svc
from app.services import suppliers as sup_svc

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


@router.put("/{job_id}", response_model=JobOut)
def update_job(
    job_id: str,
    body: JobUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    return jobs_svc.update_job(db, job_id, current_user, body.model_dump(exclude_none=True))


@router.get("/my-jobs", response_model=JobListOut)
def my_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return jobs_svc.list_my_jobs(db, current_user, page, per_page)


@router.put("/close/{job_id}", response_model=JobOut)
def close_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    return jobs_svc.close_job(db, job_id, current_user)


@router.get("/match-suppliers/{job_id}")
def match_suppliers(
    job_id: str,
    radius_km: float = Query(50.0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    job = jobs_svc.get_job(db, job_id)
    if job.haulier_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    result = sup_svc.search_suppliers(
        db,
        lat=job.pickup_lat,
        lng=job.pickup_lng,
        radius_km=radius_km,
        vehicle_type=job.vehicle_type,
    )
    return result


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


@router.get("/{job_id}/quotes/{quote_id}", response_model=QuoteOut)
def get_quote(
    job_id: str,
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = db.query(Quote).filter(Quote.id == quote_id, Quote.job_id == job_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote


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
