from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user
from app.models.job import Job, JobStatus
from app.models.payment import Payment
from app.models.user import User, Role

router = APIRouter(prefix="/invoices", tags=["Invoices"])


def _get_job_and_payment(db: Session, booking_id: str, current_user: User):
    job = db.query(Job).filter(Job.id == booking_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user.role not in (Role.ADMIN,):
        if job.haulier_id != current_user.id and job.selected_supplier_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
    payment = db.query(Payment).filter(Payment.job_id == booking_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found for this job")
    return job, payment


@router.post("/generate/{booking_id}")
async def generate_invoice(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate (or regenerate) the PDF invoice for a completed/escrowed job."""
    job, payment = _get_job_and_payment(db, booking_id, current_user)
    if job.status not in (JobStatus.PAYMENT_SECURED, JobStatus.IN_TRANSIT,
                          JobStatus.DELIVERY_SUBMITTED, JobStatus.COMPLETED):
        raise HTTPException(status_code=422, detail="Invoice only available after payment is secured")

    from app.services.invoice import generate_and_upload_invoice
    url = await generate_and_upload_invoice(job, payment)
    job.invoice_url = url
    db.commit()
    return created(data={"invoiceUrl": url, "jobRef": job.job_ref}, message="Invoice generated")


@router.get("/list")
def list_invoices(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Job).filter(Job.invoice_url.isnot(None), Job.deleted_at.is_(None))
    if current_user.role not in (Role.ADMIN,):
        if current_user.role.value in ("DRIVER", "FIRM"):
            q = q.filter(Job.selected_supplier_id == current_user.id)
        else:
            q = q.filter(Job.haulier_id == current_user.id)
    total = q.count()
    items = q.order_by(Job.updated_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    result = []
    for job in items:
        payment = db.query(Payment).filter(Payment.job_id == job.id).first()
        result.append({
            "jobId": job.id,
            "jobRef": job.job_ref,
            "invoiceUrl": job.invoice_url,
            "amount": float(payment.amount) if payment else None,
            "currency": payment.currency if payment else "INR",
        })
    return ok(data={"items": result, "total": total, "page": page, "perPage": per_page}, message="Invoices retrieved")


@router.get("/{booking_id}")
def get_invoice(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job, payment = _get_job_and_payment(db, booking_id, current_user)
    if not job.invoice_url:
        raise HTTPException(status_code=404, detail="Invoice not yet generated")
    return ok(
        data={
            "jobId": job.id,
            "jobRef": job.job_ref,
            "invoiceUrl": job.invoice_url,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "paymentStatus": payment.status.value,
        },
        message="Invoice retrieved",
    )


@router.get("/download/{booking_id}")
async def download_invoice(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download the invoice PDF directly."""
    job, payment = _get_job_and_payment(db, booking_id, current_user)

    if not job.invoice_url:
        from app.services.invoice import generate_and_upload_invoice
        url = await generate_and_upload_invoice(job, payment)
        job.invoice_url = url
        db.commit()

    from app.services.invoice import generate_invoice_pdf
    pdf_bytes = generate_invoice_pdf(job, payment)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{job.job_ref}.pdf"'},
    )
