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
    _driver = float(p.driver_amount) if p.driver_amount else float(p.amount)
    _fee    = float(p.platform_fee)  if p.platform_fee  else round(_driver * 0.125, 2)
    _vat    = float(p.vat_amount)    if getattr(p, "vat_amount", None) else round(_driver * 0.25, 2)
    _total  = round(_driver + _fee + _vat, 2)
    return {
        "paymentId": p.id,
        "jobId": p.job_id,
        "gatewayOrderId": p.gateway_order_id,
        "gatewayPaymentId": p.gateway_payment_id,
        "gatewayPayoutId": p.gateway_payout_id,
        "amount": _driver,      # Stripe-escrowed quoted amount
        "driverAmount": _driver,
        "platformFee": _fee,
        "vatAmount": _vat,
        "totalAmount": _total,  # invoice total (quote + fee + VAT)
        "currency": p.currency,
        "status": p.status.value,
        "escrowedAt": p.escrowed_at.isoformat() if p.escrowed_at else None,
        "releasedAt": p.released_at.isoformat() if p.released_at else None,
        "failedAt": p.failed_at.isoformat() if p.failed_at else None,
        "refundedAt": p.refunded_at.isoformat() if p.refunded_at else None,
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
            "amount": order["amount"],          # quoted amount (Stripe charge)
            "driverAmount": order["driverAmount"],
            "platformFee": order["platformFee"],
            "vatAmount": order["vatAmount"],
            "totalAmount": order["totalAmount"], # invoice total
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
async def release_payment(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM, Role.ADMIN)),
):
    if current_user.role not in (Role.ADMIN,):
        job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
        if not job or job.haulier_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
    p = pay_svc.release_payment(db, job_id)
    job = db.query(Job).filter(Job.id == job_id).first()
    if job and p:
        from app.services.invoice import generate_and_upload_invoice, send_invoice_to_driver
        driver = job.supplier
        try:
            url = await generate_and_upload_invoice(job, p)
            job.invoice_url = url
            db.commit()
        except Exception:
            pass
        try:
            await send_invoice_to_driver(job, p, driver, db=db)
        except Exception:
            pass
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
            "amount": order["amount"],          # quoted amount (Stripe charge)
            "driverAmount": order["driverAmount"],
            "platformFee": order["platformFee"],
            "vatAmount": order["vatAmount"],
            "totalAmount": order["totalAmount"], # invoice total
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
async def release_escrow(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM, Role.ADMIN)),
):
    if current_user.role not in (Role.ADMIN,):
        job = db.query(Job).filter(Job.id == booking_id, Job.deleted_at.is_(None)).first()
        if not job or job.haulier_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
    p = pay_svc.release_payment(db, booking_id)
    job = db.query(Job).filter(Job.id == booking_id).first()
    if job and p:
        from app.services.invoice import generate_and_upload_invoice, send_invoice_to_driver
        driver = job.supplier
        try:
            url = await generate_and_upload_invoice(job, p)
            job.invoice_url = url
            db.commit()
        except Exception:
            pass
        try:
            await send_invoice_to_driver(job, p, driver, db=db)
        except Exception:
            pass
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
    q = db.query(Payment, Job).join(Job, Job.id == Payment.job_id).filter(Job.deleted_at.is_(None))
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
            "failedAt": p.failed_at.isoformat() if p.failed_at else None,
            "refundedAt": p.refunded_at.isoformat() if p.refunded_at else None,
            "createdAt": p.created_at.isoformat() if p.created_at else None,
        }
        for p, j in rows
    ]
    return ok(
        data={"items": items, "total": total, "page": page, "perPage": per_page},
        message="Payment history retrieved",
    )


# ── Payment Methods ─────────────────────────────────────────────────────────────

# ── Haulier card management (Stripe SetupIntent flow) ─────────────────────────

@flat.post("/setup-intent", status_code=201)
def create_setup_intent(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM, Role.ADMIN)),
):
    """Create a Stripe SetupIntent so the haulier can save a card for future payments."""
    from app.services.stripe_customer import create_setup_intent as _create
    data = _create(db, current_user)
    return created(data=data, message="Setup intent created")


@flat.get("/saved-cards")
def list_saved_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM, Role.ADMIN)),
):
    """List all saved cards for this haulier."""
    from app.services.stripe_customer import list_saved_cards as _list
    cards = _list(db, current_user)
    return ok(data={"cards": cards, "total": len(cards)}, message="Saved cards retrieved")


@flat.delete("/saved-cards/{payment_method_id}")
def detach_saved_card(
    payment_method_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM, Role.ADMIN)),
):
    """Remove a saved card."""
    from app.services.stripe_customer import detach_card as _detach
    _detach(db, current_user, payment_method_id)
    return ok(data=None, message="Card removed")


# ── Legacy stubs kept for backward compatibility ───────────────────────────────

@flat.post("/methods/add", status_code=201)
def add_payment_method_legacy(
    body: PaymentMethodRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deprecated — use POST /payments/setup-intent instead."""
    return created(data={}, message="Use POST /payments/setup-intent to save a card via Stripe")


@flat.get("/methods/list")
def list_payment_methods_legacy(current_user: User = Depends(get_current_user)):
    """Deprecated — use GET /payments/saved-cards instead."""
    return ok(data={"methods": [], "total": 0}, message="Use GET /payments/saved-cards")


@flat.delete("/methods/delete/{method_id}")
def delete_payment_method_legacy(method_id: str, current_user: User = Depends(get_current_user)):
    """Deprecated — use DELETE /payments/saved-cards/{id} instead."""
    return ok(data=None, message="Use DELETE /payments/saved-cards/{id}")
