"""Stripe Connect service — driver onboarding and payout transfers."""

import stripe
import structlog
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.config import settings
from app.models.user import User, Role

log = structlog.get_logger()


def _stripe():
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


# ── Account creation ───────────────────────────────────────────────────────────

def create_connect_account(db: Session, user: User) -> str:
    """Create a Stripe Express account for a driver and persist the ID.

    GB accounts with only `transfers` capability require either the `recipient`
    service agreement (which skips document verification) or both `card_payments`
    + `transfers`.  We request both so Stripe's onboarding form includes the full
    identity/document step while satisfying the GB capability requirement.
    business_type=individual keeps the form personal — no business entity questions.
    """
    if user.role not in (Role.DRIVER, Role.FIRM):
        raise HTTPException(status_code=403, detail="Only drivers or firms can connect a Stripe account")

    if user.stripe_account_id:
        return user.stripe_account_id

    # Split the full name into first/last for pre-filling Stripe's form
    name_parts = (user.full_name or "").strip().split(" ", 1)
    first_name = name_parts[0]
    last_name  = name_parts[1] if len(name_parts) > 1 else ""

    client = _stripe()
    try:
        account = client.Account.create(
            type="express",
            country="GB",
            email=user.email,
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            business_type="individual",
            individual={
                "first_name": first_name,
                "last_name": last_name,
                "email": user.email,
                "phone": user.phone or None,
            },
            business_profile={
                "product_description": "Freight delivery driver on the FlexiShift platform",
            },
            settings={
                "payouts": {
                    "schedule": {"interval": "manual"},
                }
            },
            metadata={"user_id": user.id, "platform": "FlexiShift"},
        )
    except stripe.StripeError as e:
        log.error("stripe_connect_create_failed", user_id=user.id, error=str(e))
        raise HTTPException(status_code=400, detail=f"Stripe error: {e.user_message or str(e)}")

    user.stripe_account_id = account["id"]
    user.stripe_onboarding_complete = False
    db.commit()
    log.info("stripe_connect_account_created", user_id=user.id, account_id=account["id"])
    return account["id"]


def get_onboarding_link(
    db: Session,
    user: User,
    client_return_url: str | None = None,
    client_refresh_url: str | None = None,
) -> str:
    """Return a one-time Stripe Connect onboarding URL for the driver.

    Stripe requires HTTP/HTTPS return URLs — custom schemes (e.g. freightflex://)
    are rejected.  We route through backend redirect endpoints that Stripe accepts,
    passing the real destination (deep link or web URL) as a query param.
    """
    if not user.stripe_account_id:
        create_connect_account(db, user)

    from urllib.parse import quote
    dest_return = client_return_url or f"{settings.FRONTEND_URL}/stripe-connect/return"
    dest_refresh = client_refresh_url or f"{settings.FRONTEND_URL}/stripe-connect/refresh"

    return_url = f"{settings.BACKEND_URL}/stripe-connect/return?redirect_to={quote(dest_return, safe='')}"
    refresh_url = f"{settings.BACKEND_URL}/stripe-connect/refresh?redirect_to={quote(dest_refresh, safe='')}"

    client = _stripe()
    try:
        link = client.AccountLink.create(
            account=user.stripe_account_id,
            refresh_url=refresh_url,
            return_url=return_url,
            type="account_onboarding",
        )
    except stripe.StripeError as e:
        log.error("stripe_connect_link_failed", user_id=user.id, error=str(e))
        raise HTTPException(status_code=400, detail=f"Stripe error: {e.user_message or str(e)}")

    return link["url"]


def get_account_status(db: Session, user: User) -> dict:
    """Fetch live account status from Stripe and sync onboarding flag."""
    if not user.stripe_account_id:
        return {
            "hasAccount": False,
            "onboardingComplete": False,
            "stripeAccountId": None,
            "chargesEnabled": False,
            "payoutsEnabled": False,
            "requirementsdue": [],
        }

    client = _stripe()
    try:
        acct = client.Account.retrieve(user.stripe_account_id)
    except stripe.StripeError as e:
        log.error("stripe_connect_retrieve_failed", user_id=user.id, error=str(e))
        raise HTTPException(status_code=400, detail=f"Stripe error: {e.user_message or str(e)}")

    # details_submitted=True means the driver finished the Stripe onboarding form.
    # payouts_enabled can stay False for days while Stripe verifies bank details,
    # so we treat details_submitted as the completion signal for UX purposes.
    details_submitted = getattr(acct, "details_submitted", False)
    payouts_enabled   = getattr(acct, "payouts_enabled", False)
    onboarding_complete = details_submitted or payouts_enabled

    if onboarding_complete and not user.stripe_onboarding_complete:
        user.stripe_onboarding_complete = True
        db.commit()

    requirements = getattr(acct, "requirements", None)
    requirements_due = getattr(requirements, "currently_due", []) if requirements else []

    return {
        "hasAccount": True,
        "onboardingComplete": onboarding_complete,
        "detailsSubmitted": details_submitted,
        "stripeAccountId": user.stripe_account_id,
        "chargesEnabled": getattr(acct, "charges_enabled", False),
        "payoutsEnabled": payouts_enabled,
        "requirementsDue": requirements_due,
    }


# ── Payout / transfer ──────────────────────────────────────────────────────────

def transfer_to_driver(
    stripe_account_id: str,
    amount_pence: int,
    currency: str,
    payment_intent_id: str,
    job_ref: str,
) -> str:
    """Transfer captured funds from platform to driver's Stripe account."""
    client = _stripe()
    try:
        transfer = client.Transfer.create(
            amount=amount_pence,
            currency=currency.lower(),
            destination=stripe_account_id,
            transfer_group=job_ref,
            metadata={
                "payment_intent_id": payment_intent_id,
                "job_ref": job_ref,
            },
        )
    except stripe.StripeError as e:
        log.error(
            "stripe_transfer_failed",
            destination=stripe_account_id,
            job_ref=job_ref,
            error=str(e),
        )
        raise HTTPException(status_code=400, detail=f"Stripe transfer error: {e.user_message or str(e)}")

    log.info(
        "stripe_transfer_created",
        transfer_id=transfer["id"],
        destination=stripe_account_id,
        amount=amount_pence,
        job_ref=job_ref,
    )
    return transfer["id"]
