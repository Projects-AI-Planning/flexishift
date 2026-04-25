from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.ratings import RatingCreateRequest, RatingOut, RatingListOut
from app.services import ratings as ratings_svc

router = APIRouter(tags=["Ratings"])


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


@router.get("/users/{user_id}/ratings", response_model=RatingListOut)
def list_user_ratings(
    user_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ratings_svc.list_ratings(db, user_id, page, per_page)
