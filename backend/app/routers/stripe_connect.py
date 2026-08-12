from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse, RedirectResponse
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


def _deep_link_html(custom_url: str, android_package: str = "io.flexishift") -> HTMLResponse:
    """Return an HTML page that re-opens the mobile app after Stripe onboarding.

    Stripe only accepts http(s) return URLs, so we land here briefly and then bounce
    straight back into the app via its deep link. Android uses the `intent://` form
    (with the app package so Chrome opens the app, not the Play Store); iOS and other
    platforms use the `freightflex://` custom scheme directly. We auto-redirect on
    load (with a retry) and also expose a prominent tap fallback in case the browser
    blocks the automatic launch.
    """
    import json as _json
    path = custom_url.split("://", 1)[1] if "://" in custom_url else custom_url
    intent_url = f"intent://{path}#Intent;scheme=freightflex;package={android_package};end"
    deep_js = _json.dumps(custom_url)
    intent_js = _json.dumps(intent_url)
    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Returning to FreightFlex...</title>
</head>
<body style="font-family:sans-serif;text-align:center;margin:0;padding:48px 20px;background:#0a1726;color:#fff">
  <h2 style="margin:0 0 8px">Bank setup complete ✓</h2>
  <p style="color:#9fb3c8;margin:0 0 24px">Returning you to the FreightFlex app&hellip;</p>
  <a id="lnk" href="{custom_url}"
     style="display:inline-block;background:#1066B1;color:#fff;text-decoration:none;font-weight:800;padding:14px 28px;border-radius:14px">
    Open FreightFlex App
  </a>
  <script>
    (function() {{
      var deep = {deep_js};
      var intent = {intent_js};
      var isAndroid = /android/i.test(navigator.userAgent || '');
      var target = isAndroid ? intent : deep;
      try {{ document.getElementById('lnk').setAttribute('href', target); }} catch (e) {{}}
      function go() {{ try {{ window.location.href = target; }} catch (e) {{}} }}
      go();
      setTimeout(go, 500);
    }})();
  </script>
</body>
</html>"""
    return HTMLResponse(content=html)


@router.get("/return")
def stripe_return_redirect(redirect_to: Optional[str] = Query(default=None)):
    """Stripe redirects here after onboarding; bounce straight back into the app.
    Default destination is the app deep link (Connect onboarding is driver/mobile-only)."""
    target = redirect_to or "freightflex://stripe-connect/return"
    if target.startswith("freightflex://"):
        return _deep_link_html(target)
    return RedirectResponse(url=target, status_code=302)


@router.get("/refresh")
def stripe_refresh_redirect(redirect_to: Optional[str] = Query(default=None)):
    """Stripe redirects here when the onboarding link expires; bounce back into the app."""
    target = redirect_to or "freightflex://stripe-connect/refresh"
    if target.startswith("freightflex://"):
        return _deep_link_html(target)
    return RedirectResponse(url=target, status_code=302)


@router.get("/status")
def connect_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the driver's Stripe Connect account status."""
    status = connect_svc.get_account_status(db, current_user)
    return ok(data=status, message="Stripe Connect status retrieved")
