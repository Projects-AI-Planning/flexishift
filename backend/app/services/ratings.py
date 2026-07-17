from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException

from app.models.job import Job, JobStatus
from app.models.rating import Rating
from app.models.user import User


def create_rating(
    db: Session, job_id: str, rater: User, rated_id: str, stars: int, review_text: str | None
) -> Rating:
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=422, detail="Job must be completed to leave a rating")

    if rater.id != job.haulier_id and rater.id != job.selected_supplier_id:
        raise HTTPException(status_code=403, detail="Only job participants can rate")
    if rated_id not in (job.haulier_id, job.selected_supplier_id):
        raise HTTPException(status_code=422, detail="rated_id must be a job participant")
    if rater.id == rated_id:
        raise HTTPException(status_code=422, detail="Cannot rate yourself")

    existing = db.query(Rating).filter(
        Rating.job_id == job_id, Rating.rater_id == rater.id, Rating.rated_id == rated_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Rating already submitted")

    rating = Rating(job_id=job_id, rater_id=rater.id, rated_id=rated_id, stars=stars, review_text=review_text)
    db.add(rating)
    db.flush()

    avg = db.query(func.avg(Rating.stars)).filter(Rating.rated_id == rated_id).scalar() or 0.0
    rated_user = db.get(User, rated_id)
    if rated_user:
        rated_user.avg_rating = round(float(avg), 2)

    db.commit()
    db.refresh(rating)
    return rating


def list_ratings(db: Session, user_id: str, page: int = 1, per_page: int = 20) -> dict:
    q = db.query(Rating).filter(Rating.rated_id == user_id)
    total = q.count()
    items = q.order_by(Rating.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    avg = db.query(func.avg(Rating.stars)).filter(Rating.rated_id == user_id).scalar() or 0.0
    return {"items": items, "total": total, "avg_rating": round(float(avg), 2)}


def list_job_ratings(db: Session, job_id: str) -> dict:
    q = db.query(Rating).filter(Rating.job_id == job_id)
    total = q.count()
    items = q.order_by(Rating.created_at.asc()).all()
    avg = db.query(func.avg(Rating.stars)).filter(Rating.job_id == job_id).scalar() or 0.0
    return {"items": items, "total": total, "avg_rating": round(float(avg), 2)}
