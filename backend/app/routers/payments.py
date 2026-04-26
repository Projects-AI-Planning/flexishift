from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.job import Job
from app.models.payment import Payment, PaymentStatus
from app.models.user import User, Role
from app.schemas.payments import PaymentOrderOut, PaymentVerifyRequest, PaymentOut
from app.services import payments as pay_svc

router = APIRouter(prefix="/jobs", tags=["Payments"])

flat = APIRouter(prefix="/payments", tags=["Payments"])


class InitiateRequest(BaseModel):
    booking_id: str


class PaymentMethodRequest(BaseModel):
    account_number: str
    ifsc_code: str
    account_name: str
    account_type: str = "savings"


# ── Job-scoped endpoints (legacy/canonical) ────────────────────────────────────

@router.post("/{job_id}/payment", response_model=PaymentOrderOut, status_code=201)
def create_payment_order(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    return pay_svc.create_payment_order(db, job_id, current_user.id)


@router.post("/{job_id}/payment/verify", response_model=PaymentOut)
def verify_payment(
    job_id: str,
    body: PaymentVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    return pay_svc.verify_payment(
        db, job_id,
        body.razorpay_order_id,
        body.razorpay_payment_id,
        body.razorpay_signature,
    )


@router.post("/{job_id}/payment/release", response_model=PaymentOut)
def release_payment(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
):
    return pay_svc.release_payment(db, job_id)


@router.post("/{job_id}/payment/refund", response_model=PaymentOut)
def refund_payment(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.ADMIN)),
):
    return pay_svc.refund_payment(db, job_id, current_user.id)


@router.get("/{job_id}/payment", response_model=PaymentOut)
def get_payment(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = db.query(Payment).filter(Payment.job_id == job_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


# ── Flat /payments/* endpoints ─────────────────────────────────────────────────

@flat.post("/initiate", response_model=PaymentOrderOut, status_code=201)
def initiate_payment(
    body: InitiateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    return pay_svc.create_payment_order(db, body.booking_id, current_user.id)


@flat.post("/verify", response_model=PaymentOut)
def verify_payment_flat(
    body: PaymentVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    payment = db.query(Payment).filter(
        Payment.gateway_order_id == body.razorpay_order_id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return pay_svc.verify_payment(
        db, payment.job_id,
        body.razorpay_order_id,
        body.razorpay_payment_id,
        body.razorpay_signature,
    )


@flat.get("/status/{booking_id}", response_model=PaymentOut)
def get_payment_status(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = db.query(Payment).filter(Payment.job_id == booking_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@flat.post("/release/{booking_id}", response_model=PaymentOut)
def release_escrow(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.ADMIN)),
):
    return pay_svc.release_payment(db, booking_id)


@flat.post("/refund/{booking_id}", response_model=PaymentOut)
def refund_payment_flat(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
):
    return pay_svc.refund_payment(db, booking_id, current_user.id)


@flat.get("/history")
def payment_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Payment, Job).join(Job, Job.id == Payment.job_id)
    if current_user.role.value in ("DRIVER", "FIRM"):
        q = q.filter(Job.selected_supplier_id == current_user.id)
    elif current_user.role.value == "HAULIER":
        q = q.filter(Job.haulier_id == current_user.id)
    total = q.count()
    rows = q.order_by(Payment.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    items = [
        {
            "payment_id": p.id,
            "job_id": j.id,
            "job_ref": j.job_ref,
            "amount": float(p.amount),
            "currency": p.currency,
            "status": p.status.value,
            "created_at": p.created_at,
        }
        for p, j in rows
    ]
    return {"items": items, "total": total, "page": page, "per_page": per_page}


# ── Payment Methods (bank accounts) ───────────────────────────────────────────

@flat.post("/methods/add", status_code=201)
def add_payment_method(
    body: PaymentMethodRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fund_account_id = f"fa_{current_user.id[:8]}_{body.account_number[-4:]}"
    current_user.bank_account_id = fund_account_id
    db.commit()
    return {
        "method_id": fund_account_id,
        "account_name": body.account_name,
        "account_number": f"****{body.account_number[-4:]}",
        "ifsc_code": body.ifsc_code,
        "account_type": body.account_type,
    }


@flat.get("/methods/list")
def list_payment_methods(
    current_user: User = Depends(get_current_user),
):
    if not current_user.bank_account_id:
        return {"methods": [], "total": 0}
    return {
        "methods": [{"method_id": current_user.bank_account_id, "type": "bank_account"}],
        "total": 1,
    }


@flat.delete("/methods/delete/{method_id}", status_code=204)
def delete_payment_method(
    method_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.bank_account_id != method_id:
        raise HTTPException(status_code=404, detail="Payment method not found")
    current_user.bank_account_id = None
    db.commit()
