from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.quote import Quote, QuoteStatus
from app.models.user import User, Role
from app.services import quotes as quotes_svc

router = APIRouter(prefix="/quotes", tags=["Quotes"])

SupplierDep = require_role(Role.DRIVER, Role.FIRM)


class SubmitQuoteRequest(BaseModel):
    job_id: str = Field(..., alias="jobId")
    price: float = Field(..., alias="quoteAmount")

    model_config = {"populate_by_name": True}


class EditQuoteRequest(BaseModel):
    price: float = Field(..., alias="quoteAmount")

    model_config = {"populate_by_name": True}


def _supplier_snippet(quote: Quote) -> Optional[dict]:
    supplier = quote.supplier
    if not supplier:
        return None
    profile = supplier.profile
    return {
        "supplierId": supplier.id,
        "name": supplier.full_name,
        "photoUrl": profile.photo_url if profile else None,
        "vehicleType": profile.vehicle_type if profile else None,
        "vehicleNumber": profile.vehicle_registration if profile else None,
        "avgRating": float(supplier.avg_rating) if supplier.avg_rating is not None else None,
        "completedJobs": supplier.completed_jobs,
    }


def _quote_dict(quote: Quote, include_job: bool = False) -> dict:
    job = quote.job
    withdrawn_at = (
        quote.updated_at.isoformat()
        if quote.status == QuoteStatus.WITHDRAWN and quote.updated_at
        else None
    )
    d = {
        "quoteId": quote.id,
        "jobId": quote.job_id,
        "jobReference": job.job_ref if job else None,
        "supplierId": quote.supplier_id,
        "supplier": _supplier_snippet(quote),
        "quoteAmount": float(quote.price),
        "currency": quote.currency,
        "status": quote.status,
        "withdrawnAt": withdrawn_at,
        "createdAt": quote.created_at.isoformat() if quote.created_at else None,
        "updatedAt": quote.updated_at.isoformat() if quote.updated_at else None,
    }
    if include_job and job:
        d["job"] = {
            "jobId": job.id,
            "jobRef": job.job_ref,
            "pickupLocation": job.pickup_address,
            "dropLocation": job.drop_address,
            "jobDate": job.job_date.isoformat() if job.job_date else None,
            "timeSlot": job.time_slot.value if job.time_slot else None,
            "goodsType": job.goods_type,
            "weightKg": float(job.weight_kg) if job.weight_kg is not None else None,
            "vehicleType": job.vehicle_type,
            "status": job.status.value,
        }
    return d


@router.post("/submit", status_code=201)
async def submit_quote(
    body: SubmitQuoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    quote = await quotes_svc.submit_quote(db, body.job_id, current_user, body.price)
    return created(data=_quote_dict(quote), message="Quote submitted successfully")


@router.put("/edit/{quote_id}")
def edit_quote(
    quote_id: str,
    body: EditQuoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    quote = quotes_svc.edit_quote(db, quote_id, current_user, body.price)
    return ok(data=_quote_dict(quote), message="Quote updated")


@router.delete("/withdraw/{quote_id}")
def withdraw_quote(
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    quote = quotes_svc.withdraw_quote(db, quote_id, current_user)
    return ok(
        data={
            "quoteId": quote.id,
            "jobId": quote.job_id,
            "status": quote.status,
            "withdrawnAt": quote.updated_at.isoformat() if quote.updated_at else None,
        },
        message="Quote withdrawn",
    )


@router.get("/list/{job_id}")
def list_quotes_for_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = quotes_svc.list_quotes(db, job_id, current_user)
    return ok(
        data={"items": [_quote_dict(q, include_job=True) for q in result["items"]], "total": result["total"]},
        message="Quotes retrieved",
    )


@router.get("/my-quotes")
def my_quotes(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    result = quotes_svc.list_my_quotes(db, current_user.id, page, per_page)
    return ok(
        data={
            "items": [_quote_dict(q, include_job=True) for q in result["items"]],
            "total": result["total"],
            "page": page,
            "perPage": per_page,
        },
        message="My quotes retrieved",
    )


@router.get("/{quote_id}")
def get_quote(
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = db.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return ok(data=_quote_dict(quote, include_job=True), message="Quote retrieved")
