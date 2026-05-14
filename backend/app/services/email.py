import asyncio
import smtplib
import structlog
import httpx
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

log = structlog.get_logger()


def _normalized_gmail_app_password() -> str:
    return settings.GMAIL_APP_PASSWORD.replace(" ", "").replace("-", "").strip()


async def _send_via_sendgrid(to: str, subject: str, html_body: str) -> None:
    """Send email via SendGrid HTTP API — works on servers where SMTP is firewalled."""
    payload = {
        "personalizations": [{"to": [{"email": to}]}],
        "from": {
            "email": settings.SENDGRID_FROM_EMAIL,
            "name": settings.EMAIL_FROM_NAME,
        },
        "subject": subject,
        "content": [{"type": "text/html", "value": html_body}],
    }
    headers = {
        "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            "https://api.sendgrid.com/v3/mail/send",
            json=payload,
            headers=headers,
        )
    if resp.status_code not in (200, 202):
        raise RuntimeError(f"SendGrid error {resp.status_code}: {resp.text}")


def _send_smtp(to: str, subject: str, html_body: str) -> None:
    """Synchronous SMTP send — tries port 587 (STARTTLS) then 465 (SSL)."""
    password = _normalized_gmail_app_password()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.GMAIL_USER}>"
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    last_err: Exception | None = None

    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(settings.GMAIL_USER, password)
            smtp.sendmail(settings.GMAIL_USER, to, msg.as_string())
        return
    except OSError as exc:
        last_err = exc
        log.warning("smtp_587_failed_trying_465", error=str(exc))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as smtp:
            smtp.ehlo()
            smtp.login(settings.GMAIL_USER, password)
            smtp.sendmail(settings.GMAIL_USER, to, msg.as_string())
        return
    except OSError as exc:
        last_err = exc
        log.error("smtp_465_also_failed", error=str(exc))

    raise last_err  # type: ignore[misc]


async def send_email(to: str, subject: str, html_body: str) -> bool:
    """Send email via SendGrid or Gmail SMTP. Returns True if sent successfully."""
    # Prefer SendGrid HTTP API (works even when SMTP ports are firewalled)
    if settings.SENDGRID_API_KEY:
        try:
            await _send_via_sendgrid(to, subject, html_body)
            log.info("email_sent_sendgrid", to=to, subject=subject)
            return True
        except Exception as exc:
            log.error("sendgrid_send_failed", to=to, subject=subject, error=str(exc))
            # Fall through to SMTP if it is configured.

    # Fallback: Gmail SMTP
    if not settings.GMAIL_USER or not _normalized_gmail_app_password():
        log.warning("no_email_provider_configured", to=to, subject=subject)
        return False

    # Retry SMTP up to 2 times (handles transient network errors)
    last_exc: Exception | None = None
    for attempt in range(2):
        try:
            await asyncio.to_thread(_send_smtp, to, subject, html_body)
            log.info("email_sent_smtp", to=to, subject=subject, attempt=attempt + 1)
            return True
        except Exception as exc:
            last_exc = exc
            if attempt == 0:
                log.warning("smtp_attempt_failed_retrying", to=to, attempt=attempt + 1, error=str(exc))
                await asyncio.sleep(3)
            else:
                log.error("email_send_failed_all_attempts", to=to, subject=subject, error=str(exc))

    return False


async def send_verification_email(to: str, full_name: str, otp: str) -> bool:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#F4F7FB;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#0B1E3E;margin:0;">FreightFlex</h2>
        <p style="color:#64748B;font-size:13px;margin:4px 0 0;">Email Verification</p>
      </div>
      <div style="background:#fff;border-radius:10px;padding:28px 24px;border:1px solid #E2E8F0;">
        <p style="color:#0B1E3E;font-size:16px;font-weight:600;margin:0 0 8px;">Hi {full_name},</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Use the one-time code below to verify your FreightFlex account.
          This code expires in <strong>10 minutes</strong>.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;background:#EAF3FD;color:#1D4ED8;font-size:36px;font-weight:900;letter-spacing:12px;padding:16px 28px;border-radius:10px;border:2px dashed #93C5FD;">
            {otp}
          </span>
        </div>
        <p style="color:#94A3B8;font-size:12px;text-align:center;margin:16px 0 0;">
          If you didn't create a FreightFlex account, you can safely ignore this email.
        </p>
      </div>
    </div>
    """
    return await send_email(to, "Your FreightFlex verification code", html)


async def send_password_reset_email(to: str, full_name: str, otp: str) -> bool:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#F4F7FB;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#0B1E3E;margin:0;">FreightFlex</h2>
        <p style="color:#64748B;font-size:13px;margin:4px 0 0;">Password Reset</p>
      </div>
      <div style="background:#fff;border-radius:10px;padding:28px 24px;border:1px solid #E2E8F0;">
        <p style="color:#0B1E3E;font-size:16px;font-weight:600;margin:0 0 8px;">Hi {full_name},</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Use the one-time code below to reset your FreightFlex password.
          This code expires in <strong>10 minutes</strong>.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;background:#FFF7ED;color:#C2410C;font-size:36px;font-weight:900;letter-spacing:12px;padding:16px 28px;border-radius:10px;border:2px dashed #FED7AA;">
            {otp}
          </span>
        </div>
        <p style="color:#94A3B8;font-size:12px;text-align:center;margin:16px 0 0;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    </div>
    """
    return await send_email(to, "Your FreightFlex password reset code", html)


async def send_job_booked_email(to: str, full_name: str, job_ref: str) -> None:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#F4F7FB;border-radius:12px;">
      <h2 style="color:#0B1E3E;text-align:center;">Job Booked ✓</h2>
      <div style="background:#fff;border-radius:10px;padding:28px 24px;border:1px solid #E2E8F0;">
        <p style="color:#0B1E3E;">Hi {full_name},</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;">
          Your job <strong>{job_ref}</strong> has been booked and payment is secured in escrow.
          The driver will contact you before pickup.
        </p>
      </div>
    </div>
    """
    await send_email(to, f"Job {job_ref} Booked Successfully", html)
