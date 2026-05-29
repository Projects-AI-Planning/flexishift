from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, Role
from app.services import stripe_connect as connect_svc

router = APIRouter(prefix="/stripe-connect", tags=["Stripe Connect"])


class OnboardRequest(BaseModel):
    returnUrl: Optional[str] = None
    refreshUrl: Optional[str] = None


@router.post("/onboard", status_code=201)
def start_onboarding(
    body: OnboardRequest = OnboardRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    """Create a Stripe Express account (if not already done) and return onboarding URL."""
    connect_svc.create_connect_account(db, current_user)
    url = connect_svc.get_onboarding_link(
        db, current_user,
        client_return_url=body.returnUrl,
        client_refresh_url=body.refreshUrl,
    )
    return created(
        data={
            "onboardingUrl": url,
            "stripeAccountId": current_user.stripe_account_id,
        },
        message="Stripe onboarding link created — complete bank and ID verification",
    )


@router.get("/onboard/refresh")
def refresh_onboarding_link(
    return_url: Optional[str] = Query(default=None),
    refresh_url: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    """Generate a fresh onboarding link (previous one expired)."""
    url = connect_svc.get_onboarding_link(
        db, current_user,
        client_return_url=return_url,
        client_refresh_url=refresh_url,
    )
    return ok(data={"onboardingUrl": url}, message="Onboarding link refreshed")


@router.get("/return")
def stripe_return_redirect(redirect_to: Optional[str] = Query(default=None)):
    """Stripe redirects here after onboarding; we forward to the real destination."""
    frontend = (settings.STRIPE_FRONTEND_URL or settings.FRONTEND_URL).rstrip("/")
    target = redirect_to or f"{frontend}/stripe-connect/return"
    return RedirectResponse(url=target, status_code=302)


@router.get("/refresh")
def stripe_refresh_redirect(redirect_to: Optional[str] = Query(default=None)):
    """Stripe redirects here when the onboarding link expires; forward to real destination."""
    frontend = (settings.STRIPE_FRONTEND_URL or settings.FRONTEND_URL).rstrip("/")
    target = redirect_to or f"{frontend}/stripe-connect/refresh"
    return RedirectResponse(url=target, status_code=302)


@router.get("/status")
def connect_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the driver's Stripe Connect account status."""
    status = connect_svc.get_account_status(db, current_user)
    return ok(data=status, message="Stripe Connect status retrieved")
