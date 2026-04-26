from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.quote import Quote
from app.models.user import User, Role
from app.schemas.quotes import QuoteOut, QuoteListOut
from app.services import quotes as quotes_svc

router = APIRouter(prefix="/quotes", tags=["Quotes"])

SupplierDep = require_role(Role.DRIVER, Role.FIRM)


class SubmitQuoteRequest(BaseModel):
    job_id: str
    price: float


class EditQuoteRequest(BaseModel):
    price: float


@router.post("/submit", response_model=QuoteOut, status_code=201)
def submit_quote(
    body: SubmitQuoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    return quotes_svc.submit_quote(db, body.job_id, current_user, body.price)


@router.put("/edit/{quote_id}", response_model=QuoteOut)
def edit_quote(
    quote_id: str,
    body: EditQuoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    return quotes_svc.edit_quote(db, quote_id, current_user, body.price)


@router.delete("/withdraw/{quote_id}", status_code=204)
def withdraw_quote(
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    quotes_svc.withdraw_quote(db, quote_id, current_user)


@router.get("/list/{job_id}", response_model=QuoteListOut)
def list_quotes_for_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return quotes_svc.list_quotes(db, job_id, current_user)


@router.get("/my-quotes", response_model=QuoteListOut)
def my_quotes(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    return quotes_svc.list_my_quotes(db, current_user.id, page, per_page)


@router.get("/{quote_id}", response_model=QuoteOut)
def get_quote(
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = db.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote
