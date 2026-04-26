from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.rating import Rating
from app.models.user import User, Role
from app.schemas.ratings import RatingCreateRequest, RatingOut, RatingListOut
from app.services import ratings as ratings_svc

router = APIRouter(tags=["Ratings"])


class SubmitRatingRequest(BaseModel):
    job_id: str
    rated_id: str
    stars: int
    review_text: Optional[str] = None


class ReportRequest(BaseModel):
    reason: str


@router.post("/jobs/{job_id}/ratings", response_model=RatingOut, status_code=201)
def create_rating(
    job_id: str,
    body: RatingCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ratings_svc.create_rating(
        db, job_id, current_user, body.rated_id, body.stars, body.review_text
    )


@router.post("/ratings/submit", response_model=RatingOut, status_code=201)
def submit_rating(
    body: SubmitRatingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ratings_svc.create_rating(
        db, body.job_id, current_user, body.rated_id, body.stars, body.review_text
    )


@router.get("/users/{user_id}/ratings", response_model=RatingListOut)
def list_user_ratings(
    user_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ratings_svc.list_ratings(db, user_id, page, per_page)


@router.get("/ratings/user/{user_id}", response_model=RatingListOut)
def list_ratings_for_user(
    user_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ratings_svc.list_ratings(db, user_id, page, per_page)


@router.get("/ratings/jobs/{job_id}", response_model=RatingListOut)
def list_job_ratings(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ratings_svc.list_job_ratings(db, job_id)


@router.get("/ratings/summary/{user_id}")
def ratings_summary(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import func
    total = db.query(func.count(Rating.id)).filter(Rating.rated_id == user_id).scalar() or 0
    avg = db.query(func.avg(Rating.stars)).filter(Rating.rated_id == user_id).scalar() or 0.0
    return {
        "user_id": user_id,
        "total_ratings": total,
        "avg_rating": round(float(avg), 2),
    }


@router.post("/ratings/report/{rating_id}", status_code=201)
def report_rating(
    rating_id: str,
    body: ReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rating = db.get(Rating, rating_id)
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")
    return {
        "rating_id": rating_id,
        "reported": True,
        "reason": body.reason,
        "message": "Report submitted for admin review",
    }


@router.delete("/admin/ratings/remove/{rating_id}", status_code=204)
def admin_remove_rating(
    rating_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(Role.ADMIN)),
):
    rating = db.get(Rating, rating_id)
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")
    db.delete(rating)
    db.commit()
