from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, Role
from app.services import stripe_connect as connect_svc

router = APIRouter(prefix="/stripe-connect", tags=["Stripe Connect"])


@router.post("/onboard", status_code=201)
def start_onboarding(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    """Create a Stripe Express account (if not already done) and return onboarding URL."""
    connect_svc.create_connect_account(db, current_user)
    url = connect_svc.get_onboarding_link(db, current_user)
    return created(
        data={
            "onboardingUrl": url,
            "stripeAccountId": current_user.stripe_account_id,
        },
        message="Stripe onboarding link created — complete bank and ID verification",
    )


@router.get("/onboard/refresh")
def refresh_onboarding_link(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    """Generate a fresh onboarding link (previous one expired)."""
    url = connect_svc.get_onboarding_link(db, current_user)
    return ok(data={"onboardingUrl": url}, message="Onboarding link refreshed")


@router.get("/status")
def connect_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the driver's Stripe Connect account status."""
    status = connect_svc.get_account_status(db, current_user)
    return ok(data=status, message="Stripe Connect status retrieved")
