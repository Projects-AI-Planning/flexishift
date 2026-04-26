from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.quote import Quote
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


def _quote_dict(quote: Quote) -> dict:
    return {
        "quoteId": quote.id,
        "jobId": quote.job_id,
        "supplierId": quote.supplier_id,
        "quoteAmount": quote.price,
        "currency": quote.currency,
        "status": quote.status,
        "createdAt": quote.created_at.isoformat() if quote.created_at else None,
    }


@router.post("/submit", status_code=201)
def submit_quote(
    body: SubmitQuoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    quote = quotes_svc.submit_quote(db, body.job_id, current_user, body.price)
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
    quotes_svc.withdraw_quote(db, quote_id, current_user)
    return ok(data=None, message="Quote withdrawn")


@router.get("/list/{job_id}")
def list_quotes_for_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = quotes_svc.list_quotes(db, job_id, current_user)
    return ok(
        data={"items": [_quote_dict(q) for q in result["items"]], "total": result["total"]},
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
            "items": [_quote_dict(q) for q in result["items"]],
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
    return ok(data=_quote_dict(quote), message="Quote retrieved")
