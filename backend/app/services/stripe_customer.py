"""Stripe Customer service — haulier payment method management."""

import stripe
import structlog
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.config import settings
from app.models.user import User

log = structlog.get_logger()


def _stripe():
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def get_or_create_customer(db: Session, user: User) -> str:
    """Return existing Stripe Customer ID or create a new one."""
    client = _stripe()
    if user.stripe_customer_id:
        try:
            client.Customer.retrieve(user.stripe_customer_id)
            return user.stripe_customer_id
        except stripe.InvalidRequestError as e:
            if "no such customer" in str(e).lower():
                log.warning("stripe_customer_not_found_on_gateway", user_id=user.id, customer_id=user.stripe_customer_id)
                user.stripe_customer_id = None
                db.commit()
            else:
                log.error("stripe_customer_retrieve_failed", user_id=user.id, error=str(e))
                raise HTTPException(status_code=400, detail=f"Stripe error: {e.user_message or str(e)}")
        except stripe.StripeError as e:
            log.error("stripe_customer_retrieve_failed", user_id=user.id, error=str(e))
            raise HTTPException(status_code=400, detail=f"Stripe error: {e.user_message or str(e)}")

    try:
        customer = client.Customer.create(
            email=user.email,
            name=user.full_name,
            phone=user.phone or None,
            metadata={"user_id": user.id, "platform": "FlexiShift", "role": user.role.value},
        )
    except stripe.StripeError as e:
        log.error("stripe_customer_create_failed", user_id=user.id, error=str(e))
        raise HTTPException(status_code=400, detail=f"Stripe error: {e.user_message or str(e)}")

    user.stripe_customer_id = customer["id"]
    db.commit()
    log.info("stripe_customer_created", user_id=user.id, customer_id=customer["id"])
    return customer["id"]


def create_setup_intent(db: Session, user: User) -> dict:
    """Create a SetupIntent so the haulier can save a card for future payments."""
    customer_id = get_or_create_customer(db, user)

    client = _stripe()
    try:
        intent = client.SetupIntent.create(
            customer=customer_id,
            automatic_payment_methods={"enabled": True},
            usage="off_session",
            metadata={"user_id": user.id},
        )
    except stripe.StripeError as e:
        log.error("stripe_setup_intent_failed", user_id=user.id, error=str(e))
        raise HTTPException(status_code=400, detail=f"Stripe error: {e.user_message or str(e)}")

    return {
        "clientSecret": intent["client_secret"],
        "setupIntentId": intent["id"],
        "publishableKey": settings.STRIPE_PUBLISHABLE_KEY,
    }


def list_saved_cards(db: Session, user: User) -> list[dict]:
    """Return all saved cards for this haulier from Stripe."""
    if not user.stripe_customer_id:
        return []

    client = _stripe()
    try:
        pms = client.PaymentMethod.list(
            customer=user.stripe_customer_id,
            type="card",
        )
    except stripe.StripeError as e:
        log.error("stripe_list_cards_failed", user_id=user.id, error=str(e))
        raise HTTPException(status_code=400, detail=f"Stripe error: {e.user_message or str(e)}")

    cards = []
    for pm in pms.data:
        card = getattr(pm, "card", None) or {}
        cards.append({
            "paymentMethodId": pm["id"],
            "brand": (getattr(card, "brand", None) or "unknown").capitalize(),
            "last4": getattr(card, "last4", None) or "****",
            "expMonth": getattr(card, "exp_month", None),
            "expYear": getattr(card, "exp_year", None),
            "funding": (getattr(card, "funding", None) or "credit").capitalize(),
            "createdAt": getattr(pm, "created", None),
        })
    return cards


def detach_card(db: Session, user: User, payment_method_id: str) -> None:
    """Detach (remove) a saved card from the haulier's Stripe customer."""
    if not user.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No Stripe customer found")

    client = _stripe()
    try:
        pm = client.PaymentMethod.retrieve(payment_method_id)
        if getattr(pm, "customer", None) != user.stripe_customer_id:
            raise HTTPException(status_code=403, detail="Card does not belong to this account")
        client.PaymentMethod.detach(payment_method_id)
    except stripe.StripeError as e:
        log.error("stripe_detach_card_failed", user_id=user.id, pm_id=payment_method_id, error=str(e))
        raise HTTPException(status_code=400, detail=f"Stripe error: {e.user_message or str(e)}")

    log.info("stripe_card_detached", user_id=user.id, pm_id=payment_method_id)
