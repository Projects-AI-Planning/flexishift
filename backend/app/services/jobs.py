import string
import random
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.job import Job, JobStatus
from app.models.document import Document, DocStatus
from app.models.user import User, Role
from app.services.maps import get_route_info


def _gen_job_ref() -> str:
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choices(chars, k=8))
    return f"FF-{suffix}"


def _gen_load_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


_SLOT_END_HOURS = {'MORNING': 12, 'AFTERNOON': 18, 'EVENING': 22, 'FULL_DAY': 22}


async def create_job(db: Session, haulier: User, data: dict) -> Job:
    from app.services.maps import geocode_address

    job_date = data.get("job_date")
    today = datetime.now().date()
    if job_date == today:
        slot = (data.get("time_slot") or "").upper()
        end_hour = _SLOT_END_HOURS.get(slot)
        if end_hour is not None and datetime.now().hour >= end_hour:
            raise HTTPException(
                status_code=422,
                detail="Selected time slot has already passed for today. Please choose a later slot.",
            )

    if not data.get("pickup_lat") or not data.get("pickup_lng"):
        try:
            geo = await geocode_address(data["pickup_address"])
            data["pickup_lat"] = geo["lat"]
            data["pickup_lng"] = geo["lng"]
            data["pickup_address"] = geo["formatted_address"]
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Could not geocode pickup address: {exc}")

    if not data.get("drop_lat") or not data.get("drop_lng"):
        try:
            geo = await geocode_address(data["drop_address"])
            data["drop_lat"] = geo["lat"]
            data["drop_lng"] = geo["lng"]
            data["drop_address"] = geo["formatted_address"]
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Could not geocode drop-off address: {exc}")

    route = await get_route_info(
        data["pickup_lat"], data["pickup_lng"],
        data["drop_lat"], data["drop_lng"],
    )

    job_ref = _gen_job_ref()
    while db.query(Job).filter(Job.job_ref == job_ref).first():
        job_ref = _gen_job_ref()

    job = Job(
        haulier_id=haulier.id,
        job_ref=job_ref,
        load_code=_gen_load_code(),
        pickup_address=data["pickup_address"],
        pickup_lat=data["pickup_lat"],
        pickup_lng=data["pickup_lng"],
        drop_address=data["drop_address"],
        drop_lat=data["drop_lat"],
        drop_lng=data["drop_lng"],
        goods_type=data["goods_type"],
        weight_kg=data["weight_kg"],
        vehicle_type=data["vehicle_type"],
        job_date=data["job_date"],
        time_slot=data["time_slot"],
        driver_requirement=data.get("driver_requirement", "DRIVER_WITH_TRUCK"),
        distance_km=route["distance_km"],
        duration_min=route["duration_min"],
        status=JobStatus.OPEN,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def get_job(db: Session, job_id: str) -> Job:
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


def _has_admin_approved_documents(db: Session, user_id: str) -> bool:
    docs = db.query(Document).filter(Document.user_id == user_id).all()
    return bool(docs) and all(doc.status == DocStatus.APPROVED for doc in docs)


def list_jobs(
    db: Session,
    current_user: User,
    status: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    q = db.query(Job).filter(Job.deleted_at.is_(None))

    if current_user.role == Role.HAULIER:
        q = q.filter(Job.haulier_id == current_user.id)
    elif current_user.role in (Role.DRIVER, Role.FIRM):
        if not _has_admin_approved_documents(db, current_user.id):
            return {"items": [], "total": 0, "page": page, "per_page": per_page}
        q = q.filter(Job.status == JobStatus.OPEN)
    # ADMIN sees all

    if status:
        if status.upper() == 'BOOKED':
            q = q.filter(Job.status.in_([
                JobStatus.BOOKED, JobStatus.PAYMENT_PENDING, JobStatus.PAYMENT_SECURED,
            ]))
        else:
            q = q.filter(Job.status == JobStatus(status.upper()))

    total = q.count()
    items = q.order_by(Job.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


def update_job(db: Session, job_id: str, current_user: User, data: dict) -> Job:
    job = get_job(db, job_id)
    if job.haulier_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden")
    if job.status not in (JobStatus.OPEN,):
        raise HTTPException(status_code=422, detail="Only OPEN jobs can be updated")
    for k, v in data.items():
        setattr(job, k, v)
    db.commit()
    db.refresh(job)
    return job


def close_job(db: Session, job_id: str, current_user: User) -> Job:
    """Close an OPEN job to new quotes (withdraws active quotes, soft-cancels job)."""
    job = get_job(db, job_id)
    if job.haulier_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden")
    if job.status != JobStatus.OPEN:
        raise HTTPException(status_code=422, detail="Only OPEN jobs can be closed")
    from app.models.quote import Quote, QuoteStatus
    db.query(Quote).filter(
        Quote.job_id == job_id, Quote.status == QuoteStatus.ACTIVE
    ).update({"status": QuoteStatus.WITHDRAWN})
    job.status = JobStatus.CANCELLED
    job.deleted_at = datetime.utcnow()
    db.commit()
    db.refresh(job)
    return job


def list_available_jobs(
    db: Session,
    current_user: User,
    page: int = 1,
    per_page: int = 20,
    vehicle_type: str | None = None,
) -> dict:
    if current_user.role in (Role.DRIVER, Role.FIRM) and not _has_admin_approved_documents(db, current_user.id):
        return {"items": [], "total": 0, "page": page, "per_page": per_page}
    q = db.query(Job).filter(Job.status == JobStatus.OPEN, Job.deleted_at.is_(None))
    if vehicle_type:
        q = q.filter(Job.vehicle_type == vehicle_type)
    if getattr(current_user, 'driver_availability', None):
        q = q.filter(Job.driver_requirement == current_user.driver_availability)
    total = q.count()
    items = q.order_by(Job.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


def list_my_jobs(db: Session, current_user: User, page: int = 1, per_page: int = 20) -> dict:
    if current_user.role in (Role.DRIVER, Role.FIRM):
        q = db.query(Job).filter(
            Job.selected_supplier_id == current_user.id, Job.deleted_at.is_(None)
        )
    else:
        q = db.query(Job).filter(
            Job.haulier_id == current_user.id, Job.deleted_at.is_(None)
        )
    total = q.count()
    items = q.order_by(Job.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


def cancel_job(db: Session, job_id: str, current_user: User) -> Job:
    job = get_job(db, job_id)
    if job.haulier_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden")
    if job.status not in (JobStatus.OPEN, JobStatus.BOOKED):
        raise HTTPException(status_code=422, detail="Job cannot be cancelled in current state")
    job.status = JobStatus.CANCELLED
    job.deleted_at = datetime.utcnow()
    db.commit()
    db.refresh(job)
    return job
