import asyncio
from app.tasks.celery_app import celery_app
from app.services.fcm import send_push


@celery_app.task(name="tasks.send_push_notification", bind=True, max_retries=3, default_retry_delay=30)
def task_send_push_notification(self, token: str, title: str, body: str, data: dict | None = None):
    try:
        asyncio.run(send_push(token, title, body, data))
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(name="tasks.notify_job_open", bind=True, max_retries=2, default_retry_delay=30)
def task_notify_job_open(self, job_id: str, job_ref: str, vehicle_type: str):
    from app.database import SessionLocal
    from app.models.user import User, Role, UserStatus
    db = SessionLocal()
    try:
        drivers = db.query(User).filter(
            User.role.in_([Role.DRIVER, Role.FIRM]),
            User.status == UserStatus.ACTIVE,
            User.push_token.isnot(None),
        ).all()
        for driver in drivers:
            asyncio.run(send_push(
                driver.push_token,
                "New Job Available",
                f"Job {job_ref} needs a {vehicle_type}. Bid now!",
                {"job_id": job_id, "type": "new_job"},
            ))
    finally:
        db.close()
