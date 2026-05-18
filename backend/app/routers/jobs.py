from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.job import Job
from app.models.user import User, Role
from app.models.quote import Quote
from app.schemas.jobs import JobCreateRequest, JobUpdateRequest
from app.schemas.quotes import QuoteCreateRequest, QuoteOut
from app.services import jobs as jobs_svc, quotes as quotes_svc
from app.services import suppliers as sup_svc
from app.services.notifications import create_notification

router = APIRouter(prefix="/jobs", tags=["Jobs"])


def _job_dict(job: Job) -> dict:
    return {
        "jobId": job.id,
        "haulierId": job.haulier_id,
        "jobReference": job.job_ref,
        "loadCode": job.load_code,
        "pickupLocation": job.pickup_address,
        "pickupLat": job.pickup_lat,
        "pickupLng": job.pickup_lng,
        "dropLocation": job.drop_address,
        "dropLat": job.drop_lat,
        "dropLng": job.drop_lng,
        "goodsType": job.goods_type,
        "weightKg": job.weight_kg,
        "vehicleTypeRequired": job.vehicle_type,
        "driverRequirement": job.driver_requirement,
        "jobDate": job.job_date.isoformat() if job.job_date else None,
        "timeSlot": job.time_slot,
        "distanceKm": job.distance_km,
        "durationMin": job.duration_min,
        "status": job.status.value,
        "selectedSupplierId": job.selected_supplier_id,
        "originalEta": job.original_eta.isoformat() if job.original_eta else None,
        "invoiceUrl": job.invoice_url,
        "createdAt": job.created_at.isoformat() if job.created_at else None,
        "updatedAt": job.updated_at.isoformat() if job.updated_at else None,
    }


def _quote_dict(quote: Quote) -> dict:
    supplier = quote.supplier
    job = quote.job
    return {
        "quoteId": quote.id,
        "jobId": quote.job_id,
        "jobReference": job.job_ref if job else None,
        "supplierId": quote.supplier_id,
        "supplier": {
            "supplierId": supplier.id if supplier else None,
            "name": supplier.full_name if supplier else None,
            "phone": supplier.phone if supplier else None,
        } if supplier else None,
        "quoteAmount": quote.price,
        "currency": quote.currency,
        "status": quote.status.value if hasattr(quote.status, "value") else quote.status,
        "job": {
            "jobId": job.id if job else None,
            "jobRef": job.job_ref if job else None,
            "pickupLocation": job.pickup_address if job else None,
            "dropLocation": job.drop_address if job else None,
            "goodsType": job.goods_type if job else None,
            "weightKg": job.weight_kg if job else None,
            "vehicleType": job.vehicle_type if job else None,
            "jobDate": job.job_date.isoformat() if job and job.job_date else None,
            "timeSlot": job.time_slot if job else None,
            "status": job.status.value if job else None,
        } if job else None,
        "createdAt": quote.created_at.isoformat() if quote.created_at else None,
        "updatedAt": quote.updated_at.isoformat() if quote.updated_at else None,
    }


@router.post("/create", status_code=201)
@router.post("", status_code=201)
async def create_job(
    body: JobCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    job = await jobs_svc.create_job(db, current_user, body.model_dump(by_alias=False))
    return created(data=_job_dict(job), message="Job created successfully")


@router.get("/list")
@router.get("")
def list_jobs(
    status: str = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = jobs_svc.list_jobs(db, current_user, status, page, per_page)
    return ok(
        data={
            "items": [_job_dict(j) for j in result["items"]],
            "total": result["total"],
            "page": result["page"],
            "perPage": result["per_page"],
        },
        message="Jobs retrieved",
    )


@router.get("/available")
def available_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    vehicle_type: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    result = jobs_svc.list_available_jobs(db, current_user, page, per_page, vehicle_type)
    return ok(
        data={
            "items": [_job_dict(j) for j in result["items"]],
            "total": result["total"],
            "page": result["page"],
            "perPage": result["per_page"],
        },
        message="Available jobs retrieved",
    )


@router.get("/my-jobs")
def my_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = jobs_svc.list_my_jobs(db, current_user, page, per_page)
    return ok(
        data={
            "items": [_job_dict(j) for j in result["items"]],
            "total": result["total"],
            "page": result["page"],
            "perPage": result["per_page"],
        },
        message="My jobs retrieved",
    )


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
    return ok(data=result, message="Matching suppliers found")


@router.get("/{job_id}")
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = jobs_svc.get_job(db, job_id)
    return ok(data=_job_dict(job), message="Job retrieved")


@router.put("/{job_id}/update")
@router.put("/{job_id}")
def update_job(
    job_id: str,
    body: JobUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    job = jobs_svc.update_job(db, job_id, current_user, body.model_dump(exclude_none=True, by_alias=False))
    return ok(data=_job_dict(job), message="Job updated")


@router.put("/close/{job_id}")
def close_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    job = jobs_svc.close_job(db, job_id, current_user)
    return ok(data=_job_dict(job), message="Job closed")


@router.delete("/{job_id}", status_code=200)
def cancel_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs_svc.cancel_job(db, job_id, current_user)
    return ok(data=None, message="Job cancelled")


# ── Quote sub-endpoints ────────────────────────────────────────────────────────

@router.post("/{job_id}/quotes", status_code=201)
async def submit_quote_nested(
    job_id: str,
    body: QuoteCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    quote = await quotes_svc.submit_quote(db, job_id, current_user, body.price)
    return created(data=_quote_dict(quote), message="Quote submitted")


@router.patch("/{job_id}/quotes/{quote_id}", response_model=QuoteOut)
def edit_quote(
    job_id: str,
    quote_id: str,
    body: QuoteCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    return quotes_svc.edit_quote(db, job_id, quote_id, current_user, body.price)


@router.get("/{job_id}/quotes")
def list_quotes(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = quotes_svc.list_quotes(db, job_id, current_user)
    return ok(
        data={"items": [_quote_dict(q) for q in result["items"]], "total": result["total"]},
        message="Quotes retrieved",
    )


@router.get("/{job_id}/quotes/{quote_id}")
def get_quote(
    job_id: str,
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = db.query(Quote).filter(Quote.id == quote_id, Quote.job_id == job_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return ok(data=_quote_dict(quote), message="Quote retrieved")


@router.patch("/{job_id}/accept-quote")
@router.patch("/{job_id}/quotes/{quote_id}/select")
async def select_quote(
    job_id: str,
    quote_id: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    quote = await quotes_svc.select_quote(db, job_id, quote_id, current_user)
    return ok(data=_quote_dict(quote), message="Quote accepted")


@router.patch("/{job_id}/quotes/{quote_id}/reject")
async def reject_quote(
    job_id: str,
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    quote = quotes_svc.reject_quote(db, job_id, quote_id, current_user)
    job = db.get(Job, job_id)
    if job and quote.supplier_id:
        await create_notification(
            db,
            quote.supplier_id,
            "QUOTE_REJECTED",
            "Quote Rejected",
            f"Your quote for job {job.job_ref} was rejected.",
            {"job_id": job_id, "job_ref": job.job_ref, "quote_id": quote_id},
        )
        db.commit()
    return ok(data=_quote_dict(quote), message="Quote rejected")


@router.delete("/{job_id}/quotes/{quote_id}", status_code=200)
def withdraw_quote_nested(
    job_id: str,
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    quotes_svc.withdraw_quote(db, quote_id, current_user)
    return ok(data=None, message="Quote withdrawn")
