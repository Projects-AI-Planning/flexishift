from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, Role
from app.schemas.payments import PaymentOrderOut, PaymentVerifyRequest, PaymentOut
from app.services import payments as pay_svc

router = APIRouter(prefix="/jobs", tags=["Payments"])


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
    from app.models.payment import Payment
    from fastapi import HTTPException
    payment = db.query(Payment).filter(Payment.job_id == job_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment
