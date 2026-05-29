import io
from datetime import datetime, timezone
from fpdf import FPDF

from app.services import s3
from app.config import settings


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
        ("Load Code", job.load_code),
        ("Pickup", job.pickup_address),
        ("Delivery", job.drop_address),
        ("Goods Type", job.goods_type),
        ("Weight", f"{float(job.weight_kg):.2f} kg"),
        ("Vehicle Type", job.vehicle_type),
        ("Job Date", str(job.job_date)),
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
    # Driver invoice: show only what the driver earns (their quoted amount, excluding platform fee)
    driver_amount = float(payment.driver_amount) if getattr(payment, "driver_amount", None) else round(float(payment.amount) / 1.125, 2)
    platform_fee  = float(payment.platform_fee)  if getattr(payment, "platform_fee",  None) else round(float(payment.amount) - driver_amount, 2)
    total_charged = float(payment.amount)

    pdf.cell(120, 6, "Driver Earnings (Your Quote):")
    pdf.cell(0, 6, f"{payment.currency} {driver_amount:.2f}", ln=True)
    pdf.cell(120, 6, "Platform Fee (12.5%):")
    pdf.cell(0, 6, f"{payment.currency} {platform_fee:.2f}", ln=True)
    pdf.cell(120, 6, "Total Charged to Haulier:")
    pdf.cell(0, 6, f"{payment.currency} {total_charged:.2f}", ln=True)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(120, 6, "Your Payment:")
    pdf.cell(0, 6, f"{payment.currency} {driver_amount:.2f}", ln=True)

    return bytes(pdf.output())


async def generate_and_upload_invoice(job, payment) -> str:
    pdf_bytes = generate_invoice_pdf(job, payment)
    key = f"invoices/{job.job_ref}.pdf"
    url = s3.upload_bytes(settings.AZURE_CONTAINER_INVOICES, key, pdf_bytes, "application/pdf")
    return url
