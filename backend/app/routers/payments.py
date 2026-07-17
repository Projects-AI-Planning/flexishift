from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.job import Job
from app.models.payment import Payment
from app.models.user import User, Role
from app.services import payments as pay_svc

router = APIRouter(prefix="/jobs", tags=["Payments"])
flat = APIRouter(prefix="/payments", tags=["Payments"])


class InitiateRequest(BaseModel):
    booking_id: str = Field(..., alias="bookingId")
    model_config = {"populate_by_name": True}


class PaymentVerifyRequest(BaseModel):
    payment_intent_id: str = Field(..., alias="paymentIntentId")
    model_config = {"populate_by_name": True}


class PaymentMethodRequest(BaseModel):
    account_number: str = Field(..., alias="accountNumber")
    ifsc_code: str = Field(..., alias="ifscCode")
    account_name: str = Field(..., alias="accountName")
    account_type: str = Field("savings", alias="accountType")
    model_config = {"populate_by_name": True}


def _payment_dict(p: Payment) -> dict:
    return {
        "paymentId": p.id,
        "jobId": p.job_id,
        "gatewayOrderId": p.gateway_order_id,
        "gatewayPaymentId": p.gateway_payment_id,
        "gatewayPayoutId": p.gateway_payout_id,
        "amount": float(p.amount),
        "currency": p.currency,
        "status": p.status.value,
        "escrowedAt": p.escrowed_at.isoformat() if p.escrowed_at else None,
        "releasedAt": p.released_at.isoformat() if p.released_at else None,
        "createdAt": p.created_at.isoformat() if p.created_at else None,
    }


# ── Job-scoped endpoints ───────────────────────────────────────────────────────

@router.post("/{job_id}/payment", status_code=201)
def create_payment_order(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    order = pay_svc.create_payment_order(db, job_id, current_user.id)
    return created(
        data={
            "paymentId": order["payment_id"],
            "paymentIntentId": order["gateway_order_id"],
            "clientSecret": order["client_secret"],
            "amount": order["amount"],
            "currency": order["currency"],
            "publishableKey": order["publishable_key"],
        },
        message="Payment order created",
    )


@router.post("/{job_id}/payment/verify")
async def verify_payment(
    job_id: str,
    body: PaymentVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    p = pay_svc.verify_payment(db, job_id, body.payment_intent_id)

    # Notify the selected driver that payment is in escrow
    job = db.query(Job).filter(Job.id == job_id).first()
    if job and job.selected_supplier_id:
        from app.services.notifications import create_notification
        await create_notification(
            db, job.selected_supplier_id, "PAYMENT_ESCROWED",
            "Payment Secured in Escrow",
            f"The haulier has secured payment of £{float(p.amount):,.2f} for job {job.job_ref}. "
            "Funds are held in escrow and will be released upon job completion.",
            {
                "job_id": job_id,
                "job_ref": job.job_ref,
                "amount": float(p.amount),
                "currency": p.currency,
                "payment_intent_id": body.payment_intent_id,
            },
        )
        db.commit()

    return ok(data=_payment_dict(p), message="Payment verified and escrowed")


@router.get("/{job_id}/payment/details")
def get_payment_details(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    details = pay_svc.get_payment_details(db, job_id, current_user.id)
    return ok(data=details, message="Payment details retrieved")


@router.post("/{job_id}/payment/release")
def release_payment(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
):
    p = pay_svc.release_payment(db, job_id)
    return ok(data=_payment_dict(p), message="Payment released to supplier")


@router.post("/{job_id}/payment/refund")
def refund_payment(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.ADMIN)),
):
    p = pay_svc.refund_payment(db, job_id, current_user.id)
    return ok(data=_payment_dict(p), message="Payment refunded")


@router.get("/{job_id}/payment")
def get_payment(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Payment).filter(Payment.job_id == job_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    return ok(data=_payment_dict(p), message="Payment retrieved")


# ── Flat /payments/* endpoints ─────────────────────────────────────────────────

@flat.post("/initiate", status_code=201)
def initiate_payment(
    body: InitiateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    order = pay_svc.create_payment_order(db, body.booking_id, current_user.id)
    return created(
        data={
            "paymentId": order["payment_id"],
            "paymentIntentId": order["gateway_order_id"],
            "clientSecret": order["client_secret"],
            "amount": order["amount"],
            "currency": order["currency"],
            "publishableKey": order["publishable_key"],
        },
        message="Payment initiated",
    )


@flat.post("/verify")
async def verify_payment_flat(
    body: PaymentVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    payment = db.query(Payment).filter(
        Payment.gateway_order_id == body.payment_intent_id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    p = pay_svc.verify_payment(db, payment.job_id, body.payment_intent_id)

    job = db.query(Job).filter(Job.id == payment.job_id).first()
    if job and job.selected_supplier_id:
        from app.services.notifications import create_notification
        await create_notification(
            db, job.selected_supplier_id, "PAYMENT_ESCROWED",
            "Payment Secured in Escrow",
            f"The haulier has secured payment of £{float(p.amount):,.2f} for job {job.job_ref}. "
            "Funds are held in escrow and will be released upon job completion.",
            {
                "job_id": payment.job_id,
                "job_ref": job.job_ref,
                "amount": float(p.amount),
                "currency": p.currency,
                "payment_intent_id": body.payment_intent_id,
            },
        )
        db.commit()

    return ok(data=_payment_dict(p), message="Payment verified")


@flat.get("/status/{booking_id}")
def get_payment_status(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Payment).filter(Payment.job_id == booking_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    return ok(data=_payment_dict(p), message="Payment status retrieved")


@flat.post("/release/{booking_id}")
def release_escrow(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.ADMIN)),
):
    p = pay_svc.release_payment(db, booking_id)
    return ok(data=_payment_dict(p), message="Payment released")


from app.schemas.admin import ProcessRefundRequest

@flat.post("/refund/{booking_id}")
def refund_payment_flat(
    booking_id: str,
    body: ProcessRefundRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
):
    p = pay_svc.refund_payment(db, booking_id, current_user.id, amount=body.refund_amount, reason=body.reason, is_admin=True)
    return ok(data=_payment_dict(p), message="Payment refunded")


@flat.get("/history")
def payment_history(
    status: str = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.payment import PaymentStatus
    q = db.query(Payment, Job).join(Job, Job.id == Payment.job_id)
    if current_user.role.value in ("DRIVER", "FIRM"):
        q = q.filter(Job.selected_supplier_id == current_user.id)
    elif current_user.role.value == "HAULIER":
        q = q.filter(Job.haulier_id == current_user.id)
    if status:
        try:
            q = q.filter(Payment.status == PaymentStatus(status.upper()))
        except ValueError:
            pass
    total = q.count()
    rows = q.order_by(Payment.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    items = [
        {
            "paymentId": p.id,
            "jobId": j.id,
            "jobRef": j.job_ref,
            "pickupAddress": j.pickup_address,
            "dropAddress": j.drop_address,
            "goodsType": j.goods_type,
            "amount": float(p.amount),
            "currency": p.currency,
            "status": p.status.value,
            "escrowedAt": p.escrowed_at.isoformat() if p.escrowed_at else None,
            "releasedAt": p.released_at.isoformat() if p.released_at else None,
            "createdAt": p.created_at.isoformat() if p.created_at else None,
        }
        for p, j in rows
    ]
    return ok(
        data={"items": items, "total": total, "page": page, "perPage": per_page},
        message="Payment history retrieved",
    )


# ── Payment Methods ─────────────────────────────────────────────────────────────

@flat.post("/methods/add", status_code=201)
def add_payment_method(
    body: PaymentMethodRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fund_account_id = f"fa_{current_user.id[:8]}_{body.account_number[-4:]}"
    current_user.bank_account_id = fund_account_id
    db.commit()
    return created(
        data={
            "methodId": fund_account_id,
            "accountName": body.account_name,
            "accountNumber": f"****{body.account_number[-4:]}",
            "ifscCode": body.ifsc_code,
            "accountType": body.account_type,
        },
        message="Payment method added",
    )


@flat.get("/methods/list")
def list_payment_methods(current_user: User = Depends(get_current_user)):
    methods = []
    if current_user.bank_account_id:
        methods = [{"methodId": current_user.bank_account_id, "type": "bank_account"}]
    return ok(data={"methods": methods, "total": len(methods)}, message="Payment methods retrieved")


@flat.delete("/methods/delete/{method_id}")
def delete_payment_method(
    method_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.bank_account_id != method_id:
        raise HTTPException(status_code=404, detail="Payment method not found")
    current_user.bank_account_id = None
    db.commit()
    return ok(data=None, message="Payment method deleted")
