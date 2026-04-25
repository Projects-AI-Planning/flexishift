from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User, Role
from app.services.dashboard import driver_dashboard, haulier_dashboard

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/driver")
def get_driver_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    return driver_dashboard(db, current_user)


@router.get("/haulier")
def get_haulier_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    return haulier_dashboard(db, current_user)
