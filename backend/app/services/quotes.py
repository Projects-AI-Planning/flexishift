from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.job import Job, JobStatus
from app.models.document import Document, DocStatus
from app.models.quote import Quote, QuoteStatus
from app.models.user import User, Role


def _has_admin_approved_documents(db: Session, user_id: str) -> bool:
    docs = db.query(Document).filter(Document.user_id == user_id).all()
    return bool(docs) and all(doc.status == DocStatus.APPROVED for doc in docs)


async def submit_quote(db: Session, job_id: str, supplier: User, price: float) -> Quote:
    if supplier.role not in (Role.DRIVER, Role.FIRM):
        raise HTTPException(status_code=403, detail="Only drivers or firms can submit quotes")
    if not supplier.profile_complete:
        raise HTTPException(status_code=403, detail="Complete your profile before submitting quotes")
    if not supplier.verified:
        raise HTTPException(status_code=403, detail="Your account must be verified before submitting quotes")
    if not _has_admin_approved_documents(db, supplier.id):
        raise HTTPException(status_code=403, detail="Admin approval of your documents is required before viewing or applying for jobs")

    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.OPEN:
        raise HTTPException(status_code=422, detail="Job is not open for quotes")
    if job.haulier_id == supplier.id:
        raise HTTPException(status_code=403, detail="Cannot quote on your own job")

    existing = db.query(Quote).filter(
        Quote.job_id == job_id,
        Quote.supplier_id == supplier.id,
        Quote.status == QuoteStatus.ACTIVE,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="You already have an active quote on this job")

    quote = Quote(job_id=job_id, supplier_id=supplier.id, price=price)
    db.add(quote)
    db.commit()
    db.refresh(quote)

    from app.services.notifications import create_notification
    await create_notification(
        db, job.haulier_id, "QUOTE_RECEIVED",
        "New Quote Received",
        f"{supplier.full_name} submitted a quote of £{price:,.2f} for job {job.job_ref}.",
        {"job_id": job_id, "job_ref": job.job_ref, "quote_id": quote.id, "supplier_name": supplier.full_name},
    )
    db.commit()

    return quote



def list_quotes(db: Session, job_id: str, current_user: User) -> dict:
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if current_user.role not in (Role.ADMIN,) and job.haulier_id != current_user.id:
        if current_user.role in (Role.DRIVER, Role.FIRM):
            quotes = db.query(Quote).filter(
                Quote.job_id == job_id, Quote.supplier_id == current_user.id
            ).all()
            return {"items": quotes, "total": len(quotes)}
        raise HTTPException(status_code=403, detail="Forbidden")

    quotes = db.query(Quote).filter(Quote.job_id == job_id).all()
    return {"items": quotes, "total": len(quotes)}


async def select_quote(db: Session, job_id: str, quote_id: str, haulier: User) -> Quote:
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.haulier_id != haulier.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if job.status != JobStatus.OPEN:
        raise HTTPException(status_code=422, detail="Job is not open")

    quote = db.query(Quote).filter(Quote.id == quote_id, Quote.job_id == job_id).first()
    if not quote or quote.status != QuoteStatus.ACTIVE:
        raise HTTPException(status_code=404, detail="Quote not found or not active")

    rejected_quotes = db.query(Quote).filter(
        Quote.job_id == job_id, Quote.id != quote_id, Quote.status == QuoteStatus.ACTIVE
    ).all()
    rejected_supplier_ids = [q.supplier_id for q in rejected_quotes]

    db.query(Quote).filter(
        Quote.job_id == job_id, Quote.id != quote_id
    ).update({"status": QuoteStatus.REJECTED})

    quote.status = QuoteStatus.SELECTED
    job.status = JobStatus.BOOKED
    job.selected_supplier_id = quote.supplier_id
    db.commit()
    db.refresh(quote)

    # Notify selected supplier
    from app.services.notifications import create_notification
    await create_notification(
        db, quote.supplier_id, "JOB_BOOKED",
        "Quote Accepted!",
        f"Your quote for job {job.job_ref} has been accepted. Please await payment.",
        {"job_id": job_id, "job_ref": job.job_ref},
    )

    # Notify rejected suppliers
    for supplier_id in rejected_supplier_ids:
        await create_notification(
            db, supplier_id, "QUOTE_REJECTED",
            "Quote Not Selected",
            f"Your quote for job {job.job_ref} was not selected.",
            {"job_id": job_id, "job_ref": job.job_ref},
        )

    db.commit()
    return quote


def withdraw_quote(db: Session, quote_id: str, supplier: User) -> Quote:
    quote = db.query(Quote).filter(Quote.id == quote_id, Quote.supplier_id == supplier.id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if quote.status != QuoteStatus.ACTIVE:
        raise HTTPException(status_code=422, detail="Quote cannot be withdrawn in current state")
    quote.status = QuoteStatus.WITHDRAWN
    db.commit()
    db.refresh(quote)
    return quote


def reject_quote(db: Session, job_id: str, quote_id: str, haulier: User) -> Quote:
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.haulier_id != haulier.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if job.status != JobStatus.OPEN:
        raise HTTPException(status_code=422, detail="Job is not open")

    quote = db.query(Quote).filter(Quote.id == quote_id, Quote.job_id == job_id).first()
    if not quote or quote.status != QuoteStatus.ACTIVE:
        raise HTTPException(status_code=404, detail="Quote not found or not active")

    quote.status = QuoteStatus.REJECTED
    db.commit()
    db.refresh(quote)
    return quote


def edit_quote(db: Session, quote_id: str, supplier: User, new_price: float) -> Quote:
    quote = db.query(Quote).filter(Quote.id == quote_id, Quote.supplier_id == supplier.id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if quote.status != QuoteStatus.ACTIVE:
        raise HTTPException(status_code=422, detail="Only active quotes can be edited")
    job = db.query(Job).filter(Job.id == quote.job_id).first()
    if job and job.status != JobStatus.OPEN:
        raise HTTPException(status_code=422, detail="Job is no longer open")
    quote.price = new_price
    db.commit()
    db.refresh(quote)
    return quote


def list_my_quotes(db: Session, supplier_id: str, page: int = 1, per_page: int = 20) -> dict:
    q = db.query(Quote).filter(Quote.supplier_id == supplier_id)
    total = q.count()
    items = q.order_by(Quote.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}
