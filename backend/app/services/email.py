import httpx
import structlog

from app.config import settings

log = structlog.get_logger()

SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send"


async def send_email(to: str, subject: str, html_body: str) -> None:
    if not settings.SENDGRID_API_KEY:
        log.warning("sendgrid_not_configured", to=to, subject=subject)
        return

    payload = {
        "personalizations": [{"to": [{"email": to}]}],
        "from": {"email": settings.SENDGRID_FROM_EMAIL},
        "subject": subject,
        "content": [{"type": "text/html", "value": html_body}],
    }
    headers = {
        "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(SENDGRID_URL, json=payload, headers=headers, timeout=10)
        if resp.status_code not in (200, 202):
            log.error("sendgrid_error", status=resp.status_code, body=resp.text)


async def send_verification_email(to: str, full_name: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html = f"""
    <h2>Welcome to FreightFlex, {full_name}!</h2>
    <p>Please verify your email address by clicking the link below:</p>
    <a href="{link}" style="padding:10px 20px;background:#1D4ED8;color:#fff;text-decoration:none;border-radius:4px;">
      Verify Email
    </a>
    <p>This link expires in 24 hours.</p>
    """
    await send_email(to, "Verify your FreightFlex account", html)


async def send_password_reset_email(to: str, full_name: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    html = f"""
    <h2>Password Reset - FreightFlex</h2>
    <p>Hi {full_name}, we received a request to reset your password.</p>
    <a href="{link}" style="padding:10px 20px;background:#1D4ED8;color:#fff;text-decoration:none;border-radius:4px;">
      Reset Password
    </a>
    <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    """
    await send_email(to, "Reset your FreightFlex password", html)


async def send_job_booked_email(to: str, full_name: str, job_ref: str) -> None:
    html = f"""
    <h2>Job Booked - {job_ref}</h2>
    <p>Hi {full_name}, your job <strong>{job_ref}</strong> has been booked and payment is secured in escrow.</p>
    <p>The driver will contact you before pickup.</p>
    """
    await send_email(to, f"Job {job_ref} Booked Successfully", html)
