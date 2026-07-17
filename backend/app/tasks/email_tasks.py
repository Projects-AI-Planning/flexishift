import asyncio
from app.tasks.celery_app import celery_app
from app.services.email import send_email, send_verification_email, send_password_reset_email, send_job_booked_email


@celery_app.task(name="tasks.send_email", bind=True, max_retries=3, default_retry_delay=60)
def task_send_email(self, to: str, subject: str, html_body: str):
    try:
        asyncio.run(send_email(to, subject, html_body))
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(name="tasks.send_verification_email", bind=True, max_retries=3, default_retry_delay=60)
def task_send_verification_email(self, to: str, full_name: str, token: str):
    try:
        asyncio.run(send_verification_email(to, full_name, token))
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(name="tasks.send_password_reset_email", bind=True, max_retries=3, default_retry_delay=60)
def task_send_password_reset_email(self, to: str, full_name: str, token: str):
    try:
        asyncio.run(send_password_reset_email(to, full_name, token))
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(name="tasks.send_job_booked_email", bind=True, max_retries=3, default_retry_delay=60)
def task_send_job_booked_email(self, to: str, full_name: str, job_ref: str):
    try:
        asyncio.run(send_job_booked_email(to, full_name, job_ref))
    except Exception as exc:
        raise self.retry(exc=exc)
