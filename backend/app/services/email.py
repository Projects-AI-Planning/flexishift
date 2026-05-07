import asyncio
import smtplib
import structlog
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

log = structlog.get_logger()


def _send_smtp(to: str, subject: str, html_body: str) -> None:
    """Synchronous SMTP send — tries port 587 (STARTTLS) then 465 (SSL)."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.GMAIL_USER}>"
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    last_err: Exception | None = None

    # Port 587 STARTTLS — most common
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            smtp.sendmail(settings.GMAIL_USER, to, msg.as_string())
        return
    except OSError as exc:
        last_err = exc
        log.warning("smtp_587_failed_trying_465", error=str(exc))

    # Port 465 SSL — fallback when 587 is blocked by host firewall
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as smtp:
            smtp.ehlo()
            smtp.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            smtp.sendmail(settings.GMAIL_USER, to, msg.as_string())
        return
    except OSError as exc:
        last_err = exc
        log.error("smtp_465_also_failed", error=str(exc))

    raise last_err  # type: ignore[misc]


async def send_email(to: str, subject: str, html_body: str) -> None:
    if not settings.GMAIL_USER or not settings.GMAIL_APP_PASSWORD:
        log.warning("gmail_not_configured", to=to, subject=subject)
        return
    try:
        await asyncio.to_thread(_send_smtp, to, subject, html_body)
        log.info("email_sent", to=to, subject=subject)
    except Exception as exc:
        log.error("email_send_failed", to=to, subject=subject, error=str(exc))


async def send_verification_email(to: str, full_name: str, otp: str) -> None:
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
    await send_email(to, "Your FreightFlex verification code", html)


async def send_password_reset_email(to: str, full_name: str, otp: str) -> None:
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
    await send_email(to, "Your FreightFlex password reset code", html)


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
