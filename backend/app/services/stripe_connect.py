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

    Drivers only need `transfers` capability — they receive payouts, they never
    charge cards themselves.  Omitting `card_payments` removes all the business/
    company questions from the Stripe onboarding flow.
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
                "transfers": {"requested": True},
            },
            # recipient service agreement = payout-only account (no business questions)
            tos_acceptance={
                "service_agreement": "recipient",
            },
            business_type="individual",
            individual={
                "first_name": first_name,
                "last_name": last_name,
                "email": user.email,
                "phone": user.phone or None,
            },
            business_profile={
                "product_description": "Freight delivery driver on the FreightFlex platform",
            },
            settings={
                "payouts": {
                    "schedule": {"interval": "manual"},
                }
            },
            metadata={"user_id": user.id, "platform": "FreightFlex"},
        )
    except stripe.StripeError as e:
        log.error("stripe_connect_create_failed", user_id=user.id, error=str(e))
        raise HTTPException(status_code=400, detail=f"Stripe error: {e.user_message or str(e)}")

    user.stripe_account_id = account["id"]
    user.stripe_onboarding_complete = False
    db.commit()
    log.info("stripe_connect_account_created", user_id=user.id, account_id=account["id"])
    return account["id"]


def get_onboarding_link(db: Session, user: User) -> str:
    """Return a one-time Stripe Connect onboarding URL for the driver."""
    if not user.stripe_account_id:
        create_connect_account(db, user)

    return_url = f"{settings.FRONTEND_URL}/stripe-connect/return"
    refresh_url = f"{settings.FRONTEND_URL}/stripe-connect/refresh"

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

    # For drivers we only need payouts_enabled — they receive money, never charge cards
    onboarding_complete = acct.get("payouts_enabled", False)

    if onboarding_complete and not user.stripe_onboarding_complete:
        user.stripe_onboarding_complete = True
        db.commit()

    return {
        "hasAccount": True,
        "onboardingComplete": onboarding_complete,
        "stripeAccountId": user.stripe_account_id,
        "chargesEnabled": acct.get("charges_enabled", False),
        "payoutsEnabled": acct.get("payouts_enabled", False),
        "requirementsDue": acct.get("requirements", {}).get("currently_due", []),
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
