import asyncio
import base64
import smtplib
import structlog
import httpx
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

log = structlog.get_logger()


def _normalized_gmail_app_password() -> str:
    return settings.GMAIL_APP_PASSWORD.replace(" ", "").replace("-", "").strip()


async def _send_via_sendgrid(
    to: str,
    subject: str,
    html_body: str,
    attachment_bytes: bytes | None = None,
    attachment_name: str = "invoice.pdf",
) -> None:
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
    if attachment_bytes:
        payload["attachments"] = [
            {
                "content": base64.b64encode(attachment_bytes).decode(),
                "filename": attachment_name,
                "type": "application/pdf",
                "disposition": "attachment",
            }
        ]
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


def _send_smtp(
    to: str,
    subject: str,
    html_body: str,
    attachment_bytes: bytes | None = None,
    attachment_name: str = "invoice.pdf",
) -> None:
    """Synchronous SMTP send — tries port 587 (STARTTLS) then 465 (SSL)."""
    password = _normalized_gmail_app_password()
    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.GMAIL_USER}>"
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))
    if attachment_bytes:
        part = MIMEApplication(attachment_bytes, Name=attachment_name)
        part["Content-Disposition"] = f'attachment; filename="{attachment_name}"'
        msg.attach(part)

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


async def send_email(
    to: str,
    subject: str,
    html_body: str,
    attachment_bytes: bytes | None = None,
    attachment_name: str = "invoice.pdf",
) -> bool:
    """Send email via SendGrid or Gmail SMTP. Returns True if sent successfully."""
    # Prefer SendGrid HTTP API (works even when SMTP ports are firewalled)
    if settings.SENDGRID_API_KEY:
        try:
            await _send_via_sendgrid(to, subject, html_body, attachment_bytes, attachment_name)
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
            await asyncio.to_thread(_send_smtp, to, subject, html_body, attachment_bytes, attachment_name)
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
        <h2 style="color:#0B1E3E;margin:0;">FlexiShift</h2>
        <p style="color:#64748B;font-size:13px;margin:4px 0 0;">Email Verification</p>
      </div>
      <div style="background:#fff;border-radius:10px;padding:28px 24px;border:1px solid #E2E8F0;">
        <p style="color:#0B1E3E;font-size:16px;font-weight:600;margin:0 0 8px;">Hi {full_name},</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Use the one-time code below to verify your FlexiShift account.
          This code expires in <strong>10 minutes</strong>.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;background:#EAF3FD;color:#1D4ED8;font-size:36px;font-weight:900;letter-spacing:12px;padding:16px 28px;border-radius:10px;border:2px dashed #93C5FD;">
            {otp}
          </span>
        </div>
        <p style="color:#94A3B8;font-size:12px;text-align:center;margin:16px 0 0;">
          If you didn't create a FlexiShift account, you can safely ignore this email.
        </p>
      </div>
    </div>
    """
    return await send_email(to, "Your FlexiShift verification code", html)


async def send_password_reset_email(to: str, full_name: str, otp: str) -> bool:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#F4F7FB;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#0B1E3E;margin:0;">FlexiShift</h2>
        <p style="color:#64748B;font-size:13px;margin:4px 0 0;">Password Reset</p>
      </div>
      <div style="background:#fff;border-radius:10px;padding:28px 24px;border:1px solid #E2E8F0;">
        <p style="color:#0B1E3E;font-size:16px;font-weight:600;margin:0 0 8px;">Hi {full_name},</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Use the one-time code below to reset your FlexiShift password.
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
    return await send_email(to, "Your FlexiShift password reset code", html)


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


async def send_invoice_email_to_driver(
    to: str,
    driver_name: str,
    job_ref: str,
    pickup: str,
    delivery: str,
    driver_amount: float,
    platform_fee: float,
    vat_amount: float,   # kept for signature compatibility; always 0 now
    total_amount: float,
    currency: str,
    pdf_bytes: bytes,
) -> bool:
    cur = currency.upper()
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#F4F7FB;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#0B1E3E;margin:0;">FlexiShift</h2>
        <p style="color:#64748B;font-size:13px;margin:4px 0 0;">Payment Released — Invoice</p>
      </div>
      <div style="background:#fff;border-radius:10px;padding:28px 24px;border:1px solid #E2E8F0;">
        <p style="color:#0B1E3E;font-size:16px;font-weight:600;margin:0 0 8px;">Hi {driver_name},</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
          Great news! The payment for job <strong>{job_ref}</strong> has been released to you.
          Your invoice is attached to this email.
        </p>
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
          <p style="margin:0 0 10px;color:#166534;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Payment Summary</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1E293B;">
            <tr>
              <td style="padding:4px 0;color:#475569;">Job Reference</td>
              <td style="padding:4px 0;text-align:right;font-weight:600;">{job_ref}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#475569;">Pickup</td>
              <td style="padding:4px 0;text-align:right;">{pickup}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#475569;">Delivery</td>
              <td style="padding:4px 0;text-align:right;">{delivery}</td>
            </tr>
            <tr style="border-top:1px solid #D1FAE5;margin-top:8px;">
              <td style="padding:10px 0 4px;color:#475569;">Your Quoted Amount</td>
              <td style="padding:10px 0 4px;text-align:right;">{cur} {driver_amount:.2f}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#475569;">Platform Fee (12.5%)</td>
              <td style="padding:4px 0;text-align:right;">{cur} {platform_fee:.2f}</td>
            </tr>
            <tr style="border-top:2px solid #166534;">
              <td style="padding:10px 0 0;font-weight:700;color:#166534;">Total Charged to Haulier</td>
              <td style="padding:10px 0 0;text-align:right;font-weight:700;color:#166534;">{cur} {total_amount:.2f}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-weight:700;color:#0B1E3E;font-size:15px;">Your Earnings</td>
              <td style="padding:4px 0;text-align:right;font-weight:700;color:#0B1E3E;font-size:15px;">{cur} {driver_amount:.2f}</td>
            </tr>
          </table>
        </div>
        <p style="color:#94A3B8;font-size:12px;margin:0;">
          Your invoice (PDF) is attached. Keep it for your records.
          If you have any questions, please contact FlexiShift support.
        </p>
      </div>
    </div>
    """
    return await send_email(
        to=to,
        subject=f"Payment Released — Invoice for Job {job_ref}",
        html_body=html,
        attachment_bytes=pdf_bytes,
        attachment_name=f"Invoice_{job_ref}.pdf",
    )
