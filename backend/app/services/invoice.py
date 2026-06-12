import io
from datetime import datetime, timezone
from fpdf import FPDF

import structlog

from app.services import s3
from app.config import settings

log = structlog.get_logger()


def generate_invoice_pdf(job, payment) -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 20)
    pdf.cell(0, 10, "FlexiShift", ln=True, align="C")
    pdf.set_font("Helvetica", size=12)
    pdf.cell(0, 6, "Tax Invoice", ln=True, align="C")
    pdf.ln(8)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 6, f"Invoice #: {job.job_ref}", ln=True)
    pdf.set_font("Helvetica", size=10)
    pdf.cell(0, 6, f"Date: {datetime.now(timezone.utc).strftime('%d %b %Y')}", ln=True)
    pdf.ln(6)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 6, "Job Details", ln=True)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(2)

    pdf.set_font("Helvetica", size=10)
    rows = [
        ("Job Reference", job.job_ref),
        ("Load Code", getattr(job, "load_code", None) or "N/A"),
        ("Pickup", getattr(job, "pickup_address", None) or "N/A"),
        ("Delivery", getattr(job, "drop_address", None) or "N/A"),
        ("Goods Type", getattr(job, "goods_type", None) or "N/A"),
        ("Weight", f"{float(job.weight_kg):.2f} kg" if job.weight_kg is not None else "N/A"),
        ("Vehicle Type", getattr(job, "vehicle_type", None) or "N/A"),
        ("Job Date", str(job.job_date) if getattr(job, "job_date", None) else "N/A"),
        ("Distance", f"{float(job.distance_km):.2f} km" if job.distance_km else "N/A"),
    ]
    for label, value in rows:
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(60, 6, label + ":", ln=False)
        pdf.set_font("Helvetica", size=10)
        pdf.cell(0, 6, str(value), ln=True)

    pdf.ln(6)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 6, "Payment Summary", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(2)

    pdf.set_font("Helvetica", size=10)
    driver_amount = float(payment.driver_amount) if getattr(payment, "driver_amount", None) else float(payment.amount)
    platform_fee  = float(payment.platform_fee)  if getattr(payment, "platform_fee",  None) else round(driver_amount * 0.125, 2)
    total_charged = round(driver_amount + platform_fee, 2)
    cur = (payment.currency or "GBP").upper()

    pdf.cell(120, 6, "Driver Earnings (Quoted Amount):")
    pdf.cell(0, 6, f"{cur} {driver_amount:.2f}", ln=True)
    pdf.cell(120, 6, "Platform Fee (12.5%):")
    pdf.cell(0, 6, f"{cur} {platform_fee:.2f}", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(1)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(120, 6, "Total Charged to Haulier:")
    pdf.cell(0, 6, f"{cur} {total_charged:.2f}", ln=True)
    pdf.set_font("Helvetica", size=10)
    pdf.cell(120, 6, "Driver Payment Released:")
    pdf.cell(0, 6, f"{cur} {driver_amount:.2f}", ln=True)

    return bytes(pdf.output())


def generate_shift_invoice_pdf(shift, payment, day_number: int) -> bytes:
    from datetime import datetime, timezone
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 20)
    pdf.cell(0, 10, "FlexiShift", ln=True, align="C")
    pdf.set_font("Helvetica", size=12)
    pdf.cell(0, 6, "Tax Invoice - Shift Payment", ln=True, align="C")
    pdf.ln(8)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 6, f"Invoice #: {shift.shift_ref}-D{day_number}", ln=True)
    pdf.set_font("Helvetica", size=10)
    pdf.cell(0, 6, f"Date: {datetime.now(timezone.utc).strftime('%d %b %Y')}", ln=True)
    pdf.ln(6)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 6, "Shift Details", ln=True)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(2)

    pdf.set_font("Helvetica", size=10)
    rows = [
        ("Shift Reference", shift.shift_ref),
        ("Day",             f"{day_number} of {shift.total_days}"),
        ("Start Date",      str(shift.start_date)),
        ("End Date",        str(shift.end_date)),
        ("Pickup",          shift.pickup_address or "N/A"),
        ("Drop",            shift.drop_address or shift.location or "N/A"),
    ]
    for label, value in rows:
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(60, 6, label + ":", ln=False)
        pdf.set_font("Helvetica", size=10)
        pdf.cell(0, 6, str(value), ln=True)

    pdf.ln(6)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 6, "Payment Summary", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(2)

    pdf.set_font("Helvetica", size=10)
    driver_amount = float(payment.driver_amount) if getattr(payment, "driver_amount", None) else float(payment.amount)
    platform_fee  = float(payment.platform_fee)  if getattr(payment, "platform_fee",  None) else round(driver_amount * 0.125, 2)
    total_charged = round(driver_amount + platform_fee, 2)
    cur = (payment.currency or "GBP").upper()

    pdf.cell(120, 6, "Driver Daily Rate (Quoted):")
    pdf.cell(0, 6, f"{cur} {driver_amount:.2f}", ln=True)
    pdf.cell(120, 6, "Platform Fee (12.5%):")
    pdf.cell(0, 6, f"{cur} {platform_fee:.2f}", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(1)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(120, 6, "Total Charged to Haulier:")
    pdf.cell(0, 6, f"{cur} {total_charged:.2f}", ln=True)
    pdf.set_font("Helvetica", size=10)
    pdf.cell(120, 6, "Driver Payment Released:")
    pdf.cell(0, 6, f"{cur} {driver_amount:.2f}", ln=True)

    return bytes(pdf.output())


async def send_shift_invoice_to_driver(shift, payment, driver, day_number: int, db=None) -> str | None:
    """Generate and email a shift day-payment invoice to the driver, then create a Stripe Invoice."""
    import stripe as _stripe
    from app.config import settings as cfg
    from app.services.email import send_invoice_email_to_driver

    if not driver or not driver.email:
        log.warning("shift_invoice_no_email", shift_id=str(shift.id))
        return None

    _stripe.api_key = cfg.STRIPE_SECRET_KEY

    currency     = (payment.currency or "GBP").lower()
    drv_amount   = float(payment.driver_amount) if getattr(payment, "driver_amount", None) else float(payment.amount)
    fee_amount   = float(payment.platform_fee)  if getattr(payment, "platform_fee",  None) else round(drv_amount * 0.125, 2)
    total_amt    = round(drv_amount + fee_amount, 2)
    vat_amt      = 0.0
    amount_minor = int(round(drv_amount * 100))
    ref          = f"{shift.shift_ref}-D{day_number}"

    # ── Direct email with PDF ─────────────────────────────────────────────────
    try:
        pdf_bytes = generate_shift_invoice_pdf(shift, payment, day_number)
        await send_invoice_email_to_driver(
            to=driver.email,
            driver_name=driver.full_name or driver.email,
            job_ref=ref,
            pickup=shift.pickup_address or "—",
            delivery=shift.drop_address or shift.location or "—",
            driver_amount=drv_amount,
            platform_fee=fee_amount,
            vat_amount=vat_amt,
            total_amount=total_amt,
            currency=currency,
            pdf_bytes=pdf_bytes,
        )
        log.info("shift_invoice_email_sent", driver_id=str(driver.id), email=driver.email, ref=ref)
    except Exception as exc:
        log.error("shift_invoice_email_failed", shift_id=str(shift.id), error=str(exc))

    # ── Stripe Invoice ────────────────────────────────────────────────────────
    try:
        customer_id: str = getattr(driver, "stripe_customer_id", None) or ""
        if not customer_id:
            customer = _stripe.Customer.create(
                email=driver.email,
                name=driver.full_name,
                metadata={"user_id": str(driver.id), "platform": "FlexiShift"},
            )
            customer_id = customer["id"]
            driver.stripe_customer_id = customer_id
            if db:
                db.commit()
        else:
            try:
                _stripe.Customer.modify(customer_id, email=driver.email)
            except _stripe.StripeError:
                pass

        invoice_obj = _stripe.Invoice.create(
            customer=customer_id,
            currency=currency,
            collection_method="send_invoice",
            days_until_due=0,
            description=f"FlexiShift — Shift {ref}",
            footer=f"Pickup: {shift.pickup_address or '—'}  →  Drop: {shift.drop_address or shift.location or '—'}",
            metadata={"shift_id": str(shift.id), "shift_ref": shift.shift_ref, "day": str(day_number)},
            auto_advance=False,
        )
        invoice_id: str = getattr(invoice_obj, "id", None) or invoice_obj["id"]

        _stripe.InvoiceItem.create(
            customer=customer_id,
            invoice=invoice_id,
            amount=amount_minor,
            currency=currency,
            description=f"Driver earnings — Shift {ref}",
        )

        invoice_obj = _stripe.Invoice.finalize_invoice(invoice_id)
        invoice_obj = _stripe.Invoice.send_invoice(invoice_id)
        log.info("stripe_shift_invoice_sent", invoice_id=invoice_id, driver_id=str(driver.id))

        try:
            _stripe.Invoice.pay(invoice_id, paid_out_of_band=True)
        except _stripe.StripeError as exc:
            log.warning("stripe_shift_invoice_pay_oob_failed", invoice_id=invoice_id, error=str(exc))

        return getattr(invoice_obj, "hosted_invoice_url", None)

    except _stripe.StripeError as exc:
        log.error("stripe_shift_invoice_failed", shift_id=str(shift.id), error=str(exc))
        return None
    except Exception as exc:
        log.error("stripe_shift_invoice_unexpected", shift_id=str(shift.id), error=str(exc))
        return None


async def generate_and_upload_invoice(job, payment) -> str:
    pdf_bytes = generate_invoice_pdf(job, payment)
    key = f"invoices/{job.job_ref}.pdf"
    url = s3.upload_bytes(settings.AZURE_CONTAINER_INVOICES, key, pdf_bytes, "application/pdf")
    return url


async def send_invoice_to_driver(job, payment, driver, db=None) -> str | None:
    """
    Email the invoice PDF directly to the driver, then create a Stripe Invoice
    for record-keeping.  Returns the hosted_invoice_url on success, None on failure.

    Flow
    ----
    1. Generate the invoice PDF and email it to the driver via Gmail/SendGrid.
    2. Ensure the driver has a Stripe Customer (creates one if missing).
    3. Create a draft Invoice with collection_method=send_invoice.
    4. Attach a line item (driver's earnings).
    5. Finalise the invoice → status becomes "open".
    6. Send the invoice → Stripe emails the driver directly from Stripe's domain.
    7. Mark the invoice as paid out-of-band (money already transferred).
    """
    import stripe as _stripe
    from app.config import settings as cfg
    from app.services.email import send_invoice_email_to_driver

    if not driver or not driver.email:
        log.warning("stripe_invoice_no_email", job_id=str(job.id))
        return None

    _stripe.api_key = cfg.STRIPE_SECRET_KEY

    currency   = (payment.currency or "GBP").lower()
    drv_amount = (
        float(payment.driver_amount)
        if getattr(payment, "driver_amount", None)
        else round(float(payment.amount) / 1.125, 2)
    )
    amount_minor = int(round(drv_amount * 100))

    # ── Step 1: Email the PDF invoice directly to the driver ──────────────────
    fee_amount = float(payment.platform_fee) if getattr(payment, "platform_fee", None) else round(drv_amount * 0.125, 2)
    total_amt  = round(drv_amount + fee_amount, 2)
    vat_amt    = 0.0
    try:
        pdf_bytes = generate_invoice_pdf(job, payment)
        await send_invoice_email_to_driver(
            to=driver.email,
            driver_name=driver.full_name or driver.email,
            job_ref=job.job_ref,
            pickup=job.pickup_address or "—",
            delivery=job.drop_address or "—",
            driver_amount=drv_amount,
            platform_fee=fee_amount,
            vat_amount=vat_amt,
            total_amount=total_amt,
            currency=currency,
            pdf_bytes=pdf_bytes,
        )
        log.info("invoice_email_sent", driver_id=str(driver.id), email=driver.email)
    except Exception as exc:
        log.error("invoice_email_failed", job_id=str(job.id), error=str(exc))

    try:
        # ── 1. Customer ───────────────────────────────────────────────────────
        customer_id: str = getattr(driver, "stripe_customer_id", None) or ""
        if not customer_id:
            customer = _stripe.Customer.create(
                email=driver.email,
                name=driver.full_name,
                metadata={"user_id": str(driver.id), "platform": "FlexiShift"},
            )
            customer_id = customer["id"]
            driver.stripe_customer_id = customer_id
            if db:
                db.commit()
            log.info("stripe_customer_created", driver_id=str(driver.id), customer_id=customer_id)
        else:
            # Keep email in sync
            try:
                _stripe.Customer.modify(customer_id, email=driver.email)
            except _stripe.StripeError:
                pass

        # ── 2. Draft Invoice ──────────────────────────────────────────────────
        invoice_obj = _stripe.Invoice.create(
            customer=customer_id,
            currency=currency,
            collection_method="send_invoice",
            days_until_due=0,
            description=f"FlexiShift — Job {job.job_ref} completed",
            footer=(
                f"Pickup: {job.pickup_address or '—'}  →  "
                f"Delivery: {job.drop_address or '—'}"
            ),
            metadata={
                "job_id":  str(job.id),
                "job_ref": job.job_ref,
                "platform": "FlexiShift",
            },
            auto_advance=False,
        )
        invoice_id: str = getattr(invoice_obj, "id", None) or invoice_obj["id"]

        # ── 3. Line item ──────────────────────────────────────────────────────
        _stripe.InvoiceItem.create(
            customer=customer_id,
            invoice=invoice_id,
            amount=amount_minor,
            currency=currency,
            description=f"Driver earnings — Job {job.job_ref}",
        )

        # ── 4. Finalise (draft → open) ────────────────────────────────────────
        invoice_obj = _stripe.Invoice.finalize_invoice(invoice_id)

        # ── 5. Send — Stripe emails the driver directly ───────────────────────
        invoice_obj = _stripe.Invoice.send_invoice(invoice_id)
        log.info("stripe_invoice_sent", invoice_id=invoice_id, driver_id=str(driver.id))

        # ── 6. Mark paid out-of-band (money already transferred) ─────────────
        try:
            _stripe.Invoice.pay(invoice_id, paid_out_of_band=True)
        except _stripe.StripeError as exc:
            log.warning("stripe_invoice_pay_oob_failed", invoice_id=invoice_id, error=str(exc))

        hosted_url: str | None = getattr(invoice_obj, "hosted_invoice_url", None)
        return hosted_url

    except _stripe.StripeError as exc:
        log.error("stripe_invoice_failed", job_id=str(job.id), error=str(exc))
        return None
    except Exception as exc:
        log.error("stripe_invoice_unexpected", job_id=str(job.id), error=str(exc))
        return None
