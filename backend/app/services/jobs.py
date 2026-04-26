import string
import random
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.job import Job, JobStatus
from app.models.user import User, Role
from app.services.maps import get_route_info


def _gen_job_ref() -> str:
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choices(chars, k=8))
    return f"FF-{suffix}"


def _gen_load_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


async def create_job(db: Session, haulier: User, data: dict) -> Job:
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
        q = q.filter(Job.status == JobStatus.OPEN)
    # ADMIN sees all

    if status:
        q = q.filter(Job.status == JobStatus(status))

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


def cancel_job(db: Session, job_id: str, current_user: User) -> Job:
    job = get_job(db, job_id)
    if job.haulier_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden")
    if job.status not in (JobStatus.OPEN, JobStatus.BOOKED):
        raise HTTPException(status_code=422, detail="Job cannot be cancelled in current state")
    job.status = JobStatus.CANCELLED
    job.deleted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(job)
    return job
