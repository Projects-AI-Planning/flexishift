import string
import random
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.job import Job, JobStatus
from app.models.document import Document, DocStatus
from app.models.user import User, UserProfile, Role
from app.services.maps import get_route_info


def _gen_job_ref() -> str:
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choices(chars, k=8))
    return f"FF-{suffix}"




_SLOT_END_HOURS   = {'MORNING': 12, 'AFTERNOON': 18, 'EVENING': 22, 'NIGHT': 30, 'FULL_DAY': 30}
_SLOT_START_HOURS = {'MORNING': 6,  'AFTERNOON': 12, 'EVENING': 18, 'NIGHT': 22, 'FULL_DAY': 0}


def _compute_eta(data: dict):
    from datetime import timedelta
    estimated = data.get("estimated_delivery")
    if estimated:
        return datetime.combine(estimated, datetime.min.time())
    job_date     = data.get("job_date")
    duration_min = data.get("duration_min")
    if not job_date or not duration_min:
        return None
    slot       = (data.get("time_slot") or "MORNING").upper()
    start_hour = _SLOT_START_HOURS.get(slot, 6)
    departure  = datetime.combine(job_date, datetime.min.time()).replace(hour=start_hour)
    return departure + timedelta(minutes=int(duration_min))


def _parse_deliver_by_dt(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).replace(tzinfo=None)
    except (ValueError, AttributeError):
        return None


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

    # Geocode intermediate stops
    raw_stops = data.get("stops") or []
    geocoded_stops = []
    for i, stop in enumerate(raw_stops):
        addr = stop.get("address", "").strip()
        if not addr:
            continue
        delivery_qty  = stop.get("deliveryQty")
        delivery_time = stop.get("deliveryTime")
        if stop.get("lat") and stop.get("lng"):
            geocoded_stops.append({
                "address": addr,
                "lat": float(stop["lat"]),
                "lng": float(stop["lng"]),
                "order": i + 1,
                **({"deliveryQty": delivery_qty}   if delivery_qty  is not None else {}),
                **({"deliveryTime": delivery_time} if delivery_time is not None else {}),
            })
        else:
            try:
                geo = await geocode_address(addr)
                geocoded_stops.append({
                    "address": geo["formatted_address"],
                    "lat": float(geo["lat"]),
                    "lng": float(geo["lng"]),
                    "order": i + 1,
                    **({"deliveryQty": delivery_qty}   if delivery_qty  is not None else {}),
                    **({"deliveryTime": delivery_time} if delivery_time is not None else {}),
                })
            except Exception:
                geocoded_stops.append({
                    "address": addr, "lat": None, "lng": None, "order": i + 1,
                    **({"deliveryQty": delivery_qty}   if delivery_qty  is not None else {}),
                    **({"deliveryTime": delivery_time} if delivery_time is not None else {}),
                })

    # Append final destination delivery time as a special entry if provided
    final_delivery_time = data.get("final_delivery_time")
    if final_delivery_time:
        geocoded_stops.append({
            "address": data["drop_address"],
            "lat": float(data["drop_lat"]),
            "lng": float(data["drop_lng"]),
            "order": len(geocoded_stops) + 1,
            "isFinalDestination": True,
            "deliveryTime": final_delivery_time,
        })

    data["duration_min"] = route["duration_min"]

    job_ref = _gen_job_ref()
    while db.query(Job).filter(Job.job_ref == job_ref).first():
        job_ref = _gen_job_ref()

    job = Job(
        haulier_id=haulier.id,
        job_ref=job_ref,
        load_code=data.get("load_code", "").strip().upper(),
        access_code=(data.get("access_code") or "").strip().upper() or None,
        pickup_address=data["pickup_address"],
        pickup_lat=data["pickup_lat"],
        pickup_lng=data["pickup_lng"],
        drop_address=data["drop_address"],
        drop_lat=data["drop_lat"],
        drop_lng=data["drop_lng"],
        goods_type=data["goods_type"],
        weight_kg=data.get("weight_kg"),
        total_capacity=data.get("total_capacity"),
        compartments=data.get("compartments"),
        compartment_details=data.get("compartment_details") or None,
        special_instructions=data.get("special_instructions"),
        vehicle_type=data.get("vehicle_type"),
        job_date=data["job_date"],
        time_slot=data["time_slot"],
        job_time=(data.get("job_time") or data.get("jobTime") or "").strip() or None,
        deliver_by_dt=_parse_deliver_by_dt(data.get("deliverByDt") or data.get("deliver_by_dt")),
        driver_requirement=data.get("driver_requirement", "DRIVER_WITH_TRUCK"),
        stops=geocoded_stops if geocoded_stops else None,
        distance_km=route["distance_km"],
        duration_min=route["duration_min"],
        original_eta=_compute_eta(data),
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


_REQUIRED_DOCS: dict[str, list] = {
    'DRIVER_ONLY':       ['DRIVING_LICENCE'],
    'TRUCK_ONLY':        ['VEHICLE_REG', 'VEHICLE_INSURANCE'],
    'DRIVER_WITH_TRUCK': ['DRIVING_LICENCE', 'VEHICLE_REG', 'VEHICLE_INSURANCE'],
}


def _has_admin_approved_documents(db: Session, user_id: str) -> bool:
    docs = db.query(Document).filter(Document.user_id == user_id).all()
    return bool(docs) and all(doc.status == DocStatus.APPROVED for doc in docs)


def _has_required_docs_for_availability(db: Session, user_id: str, driver_avail: str | None) -> bool:
    """Return True only when every document required for the driver's availability type
    has been uploaded AND approved by admin."""
    required_types = _REQUIRED_DOCS.get(driver_avail or '', [])
    if not required_types:
        return _has_admin_approved_documents(db, user_id)
    for doc_type_str in required_types:
        approved = db.query(Document).filter(
            Document.user_id == user_id,
            Document.doc_type == doc_type_str,
            Document.status == DocStatus.APPROVED,
        ).first()
        if not approved:
            return False
    return True


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
        profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
        driver_avail = profile.driver_availability if profile else None
        if not _has_required_docs_for_availability(db, current_user.id, driver_avail):
            return {"items": [], "total": 0, "page": page, "per_page": per_page}
        from datetime import date as _date
        q = q.filter(Job.status == JobStatus.OPEN, Job.job_date >= _date.today())
        if driver_avail == 'DRIVER_ONLY':
            q = q.filter(Job.driver_requirement.in_(['DRIVER_ONLY', None]))
        elif driver_avail == 'TRUCK_ONLY':
            q = q.filter(Job.driver_requirement.in_(['TRUCK_ONLY', None]))
        # DRIVER_WITH_TRUCK sees all job requirement types — no additional filter
    # ADMIN sees all

    if status:
        if status.upper() == 'BOOKED':
            q = q.filter(Job.status.in_([
                JobStatus.BOOKED, JobStatus.PAYMENT_PENDING, JobStatus.PAYMENT_SECURED,
            ]))
        elif status.upper() == 'IN_TRANSIT':
            q = q.filter(Job.status.in_([JobStatus.IN_TRANSIT, JobStatus.DELIVERY_SUBMITTED]))
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
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    driver_avail = profile.driver_availability if profile else None
    if current_user.role in (Role.DRIVER, Role.FIRM) and not _has_required_docs_for_availability(db, current_user.id, driver_avail):
        return {"items": [], "total": 0, "page": page, "per_page": per_page}
    from datetime import date as _date
    today = _date.today()
    q = db.query(Job).filter(
        Job.status == JobStatus.OPEN,
        Job.deleted_at.is_(None),
        Job.job_date >= today,          # hide jobs whose pickup date has passed
    )
    if vehicle_type:
        q = q.filter(Job.vehicle_type == vehicle_type)
    if driver_avail == 'DRIVER_ONLY':
        q = q.filter(Job.driver_requirement.in_(['DRIVER_ONLY', None]))
    elif driver_avail == 'TRUCK_ONLY':
        q = q.filter(Job.driver_requirement.in_(['TRUCK_ONLY', None]))
    # DRIVER_WITH_TRUCK sees all job requirement types — no additional filter
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
