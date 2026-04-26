from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional, List

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.rating import Rating
from app.models.user import User, Role
from app.services import ratings as ratings_svc

router = APIRouter(tags=["Ratings"])


class SubmitRatingRequest(BaseModel):
    job_id: str = Field(..., alias="jobId")
    booking_id: Optional[str] = Field(None, alias="bookingId")
    rated_user_id: str = Field(..., alias="ratedUserId")
    star_rating: int = Field(..., alias="starRating")
    review: Optional[str] = None
    tags: Optional[List[str]] = None
    model_config = {"populate_by_name": True}


class ReportRatingRequest(BaseModel):
    report_reason: str = Field(..., alias="reportReason")
    description: Optional[str] = None
    model_config = {"populate_by_name": True}


class AdminRemoveRatingRequest(BaseModel):
    reason: Optional[str] = None
    notify_reporter: bool = Field(True, alias="notifyReporter")
    notify_reviewer: bool = Field(True, alias="notifyReviewer")
    model_config = {"populate_by_name": True}


def _rating_dict(r: Rating) -> dict:
    return {
        "ratingId": r.id,
        "jobId": r.job_id,
        "raterId": r.rater_id,
        "ratedId": r.rated_id,
        "starRating": r.stars,
        "review": r.review_text,
        "tags": r.tags or [],
        "submittedAt": r.created_at.isoformat() if r.created_at else None,
    }


def _rating_breakdown(db: Session, user_id: str) -> dict:
    breakdown = {}
    for star in range(1, 6):
        count = db.query(func.count(Rating.id)).filter(
            Rating.rated_id == user_id, Rating.stars == star
        ).scalar() or 0
        breakdown[f"{star}_star"] = count
    return breakdown


@router.post("/ratings/submit", status_code=201)
def submit_rating(
    body: SubmitRatingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rating = ratings_svc.create_rating(
        db, body.job_id, current_user, body.rated_user_id, body.star_rating, body.review
    )
    if body.tags:
        rating.tags = body.tags
        db.commit()
    return created(
        data={
            "ratingId": rating.id,
            "jobId": rating.job_id,
            "ratedUserId": rating.rated_id,
            "starRating": rating.stars,
            "review": rating.review_text,
            "tags": rating.tags or [],
            "submittedAt": rating.created_at.isoformat() if rating.created_at else None,
        },
        message="Rating submitted successfully.",
    )


@router.post("/jobs/{job_id}/ratings", status_code=201)
def create_rating_job_scoped(
    job_id: str,
    body: SubmitRatingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rated_id = body.rated_user_id or getattr(body, "rated_id", None)
    rating = ratings_svc.create_rating(
        db, job_id, current_user, rated_id, body.star_rating, body.review
    )
    if body.tags:
        rating.tags = body.tags
        db.commit()
    return created(data=_rating_dict(rating), message="Rating submitted")


@router.get("/ratings/user/{user_id}")
@router.get("/users/{user_id}/ratings")
def list_ratings_for_user(
    user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("latest", alias="sortBy"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    q = db.query(Rating).filter(Rating.rated_id == user_id)
    total = q.count()
    total_pages = (total + limit - 1) // limit
    avg = db.query(func.avg(Rating.stars)).filter(Rating.rated_id == user_id).scalar() or 0.0
    items = q.order_by(Rating.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    ratings = []
    for r in items:
        rater = db.get(User, r.rater_id)
        ratings.append({
            "ratingId": r.id,
            "jobReference": r.job.job_ref if r.job else None,
            "ratedBy": {
                "name": rater.full_name if rater else None,
                "role": rater.role.value.lower() if rater else None,
            },
            "starRating": r.stars,
            "review": r.review_text,
            "tags": r.tags or [],
            "submittedAt": r.created_at.isoformat() if r.created_at else None,
        })

    return ok(
        data={
            "userId": user_id,
            "name": target.full_name,
            "averageRating": round(float(avg), 2),
            "totalRatings": total,
            "ratingBreakdown": _rating_breakdown(db, user_id),
            "ratings": ratings,
            "page": page,
            "limit": limit,
            "totalPages": total_pages,
        },
        message="User ratings fetched successfully.",
    )


@router.get("/ratings/job/{job_id}")
@router.get("/ratings/jobs/{job_id}")
def list_job_ratings(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.job import Job
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    items = db.query(Rating).filter(Rating.job_id == job_id).order_by(Rating.created_at.asc()).all()

    ratings = []
    for r in items:
        rater = db.get(User, r.rater_id)
        rated = db.get(User, r.rated_id)
        ratings.append({
            "ratingId": r.id,
            "ratedBy": {
                "userId": r.rater_id,
                "name": rater.full_name if rater else None,
                "role": rater.role.value.lower() if rater else None,
            },
            "ratedUser": {
                "userId": r.rated_id,
                "name": rated.full_name if rated else None,
                "role": rated.role.value.lower() if rated else None,
            },
            "starRating": r.stars,
            "review": r.review_text,
            "tags": r.tags or [],
            "submittedAt": r.created_at.isoformat() if r.created_at else None,
        })

    return ok(
        data={
            "jobId": job_id,
            "jobReference": job.job_ref,
            "ratings": ratings,
            "totalRatings": len(ratings),
        },
        message="Job ratings fetched successfully.",
    )


@router.get("/ratings/summary/{user_id}")
def ratings_summary(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    total = db.query(func.count(Rating.id)).filter(Rating.rated_id == user_id).scalar() or 0
    avg = db.query(func.avg(Rating.stars)).filter(Rating.rated_id == user_id).scalar() or 0.0

    last5 = (
        db.query(Rating)
        .filter(Rating.rated_id == user_id)
        .order_by(Rating.created_at.desc())
        .limit(5)
        .all()
    )
    last5_avg = round(sum(r.stars for r in last5) / len(last5), 2) if last5 else 0.0

    return ok(
        data={
            "userId": user_id,
            "name": target.full_name,
            "role": target.role.value.lower(),
            "averageRating": round(float(avg), 2),
            "totalRatings": total,
            "ratingBreakdown": _rating_breakdown(db, user_id),
            "last5RatingsAverage": last5_avg,
        },
        message="Rating summary fetched successfully.",
    )


@router.post("/ratings/report/{rating_id}", status_code=201)
def report_rating(
    rating_id: str,
    body: ReportRatingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rating = db.get(Rating, rating_id)
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")
    from uuid import uuid4
    return created(
        data={
            "reportId": f"rep_{str(uuid4())[:8]}",
            "ratingId": rating_id,
            "reportReason": body.report_reason,
            "description": body.description,
            "status": "under_review",
            "reportedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="Review reported successfully. Admin will review within 24 hours.",
    )


@router.delete("/admin/ratings/remove/{rating_id}")
def admin_remove_rating(
    rating_id: str,
    body: AdminRemoveRatingRequest = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role(Role.ADMIN)),
):
    rating = db.get(Rating, rating_id)
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")
    db.delete(rating)
    db.commit()
    return ok(
        data={
            "ratingId": rating_id,
            "removedBy": current_admin.id,
            "reason": body.reason if body else None,
            "removedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="Review removed successfully.",
    )
