import asyncio
from app.tasks.celery_app import celery_app


@celery_app.task(name="tasks.generate_invoice", bind=True, max_retries=3, default_retry_delay=60)
def task_generate_invoice(self, job_id: str):
    from app.database import SessionLocal
    from app.models.job import Job
    from app.models.payment import Payment
    from app.services.invoice import generate_and_upload_invoice

    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        payment = db.query(Payment).filter(Payment.job_id == job_id).first()
        if not job or not payment:
            return

        url = asyncio.run(generate_and_upload_invoice(job, payment))
        job.invoice_url = url
        db.commit()
    except Exception as exc:
        db.rollback()
        raise self.retry(exc=exc)
    finally:
        db.close()
