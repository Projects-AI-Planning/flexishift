from __future__ import annotations

import argparse
import os
import sys
from datetime import date, datetime, timedelta, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional fallback
    load_dotenv = None

_backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env_path = os.path.join(_backend_root, ".env")
if load_dotenv and os.path.exists(_env_path):
    load_dotenv(_env_path, override=False)

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.document import Document, DocStatus, DocType
from app.models.job import Job, JobStatus, TimeSlot
from app.models.payment import Payment, PaymentStatus
from app.models.user import Role, User, UserProfile, UserStatus


DEFAULT_DRIVER_ID = "fb1b0fb4-bd7a-4f78-9cba-b7bcca5522c6"
DEFAULT_DRIVER_EMAIL = "sonawanenavnath2026@gmail.com"
DEFAULT_DRIVER_NAME = "Navnath Sonawane"
DEFAULT_DRIVER_PHONE = "9552662931"

DEFAULT_HAULIER_EMAIL = "demo-haulier@freightflex.local"
DEFAULT_HAULIER_NAME = "FreightFlex Demo Haulier"
DEFAULT_HAULIER_PHONE = "9000000000"
DEFAULT_HAULIER_PASSWORD = "DemoHaulier123!"

DEFAULT_PROFILE_PHOTO_URL = "https://placehold.co/512x512/png?text=Navnath"
DEFAULT_DOC_URL = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"


def _get_or_create_profile(db: Session, user: User) -> UserProfile:
    profile = user.profile
    if profile:
        return profile
    profile = UserProfile(user_id=user.id)
    db.add(profile)
    db.flush()
    return profile


def _upsert_document(
    db: Session,
    user_id: str,
    doc_type: DocType,
    file_url: str,
    *,
    status: DocStatus = DocStatus.APPROVED,
) -> Document:
    doc = (
        db.query(Document)
        .filter(Document.user_id == user_id, Document.doc_type == doc_type)
        .first()
    )
    now = datetime.now(timezone.utc)
    if doc:
        doc.file_url = file_url
        doc.status = status
        doc.reviewed_at = now if status != DocStatus.PENDING else None
        doc.rejection_reason = None
        doc.reviewed_by = None
    else:
        doc = Document(
            user_id=user_id,
            doc_type=doc_type,
            file_url=file_url,
            status=status,
            reviewed_at=now if status != DocStatus.PENDING else None,
        )
        db.add(doc)
    return doc


def _upsert_job(db: Session, *, job_ref: str, payload: dict) -> Job:
    job = db.query(Job).filter(Job.job_ref == job_ref).first()
    if job:
        for key, value in payload.items():
            setattr(job, key, value)
        return job

    job = Job(job_ref=job_ref, **payload)
    db.add(job)
    return job


def _ensure_demo_haulier(db: Session) -> User:
    haulier = (
        db.query(User)
        .filter(User.email == DEFAULT_HAULIER_EMAIL, User.deleted_at.is_(None))
        .first()
    )
    if haulier:
        profile = _get_or_create_profile(db, haulier)
        haulier.full_name = DEFAULT_HAULIER_NAME
        haulier.phone = DEFAULT_HAULIER_PHONE
        haulier.status = UserStatus.ACTIVE
        haulier.verified = True
        haulier.profile_complete = True
        profile.company_name = "FreightFlex Demo Logistics"
        profile.company_address = "1 Demo Freight Yard, Mumbai, MH"
        return haulier

    haulier = User(
        full_name=DEFAULT_HAULIER_NAME,
        email=DEFAULT_HAULIER_EMAIL,
        phone=DEFAULT_HAULIER_PHONE,
        password_hash=hash_password(DEFAULT_HAULIER_PASSWORD),
        role=Role.HAULIER,
        status=UserStatus.ACTIVE,
        verified=True,
        profile_complete=True,
    )
    db.add(haulier)
    db.flush()

    db.add(
        UserProfile(
            user_id=haulier.id,
            company_name="FreightFlex Demo Logistics",
            company_address="1 Demo Freight Yard, Mumbai, MH",
            coverage_area="Maharashtra",
        )
    )
    return haulier


def seed_driver_demo_data(
    user_id: str = DEFAULT_DRIVER_ID,
    email: str = DEFAULT_DRIVER_EMAIL,
    profile_photo_url: str = DEFAULT_PROFILE_PHOTO_URL,
    doc_url: str = DEFAULT_DOC_URL,
) -> None:
    db: Session = SessionLocal()
    try:
        driver = db.get(User, user_id)
        if not driver or driver.deleted_at is not None or driver.role != Role.DRIVER:
            driver = (
                db.query(User)
                .filter(
                    User.email == email,
                    User.role == Role.DRIVER,
                    User.deleted_at.is_(None),
                )
                .first()
            )
        if not driver:
            raise LookupError(
                f"Driver not found for id={user_id!r} and email={email!r}"
            )

        profile = _get_or_create_profile(db, driver)
        driver.full_name = DEFAULT_DRIVER_NAME
        driver.email = email
        driver.phone = DEFAULT_DRIVER_PHONE
        driver.status = UserStatus.ACTIVE
        driver.verified = True
        driver.profile_complete = True
        driver.avg_rating = 4.9
        driver.completed_jobs = max(int(driver.completed_jobs or 0), 1)

        profile.photo_url = profile_photo_url
        profile.licence_number = "MH15 20260000001"
        profile.vehicle_type = "VAN"
        profile.vehicle_registration = "MH 15 TC 9999"

        doc_fixtures = [
            (DocType.DRIVING_LICENCE, f"{doc_url}?doc=driving-licence", DocStatus.APPROVED),
            (DocType.VEHICLE_REG, f"{doc_url}?doc=vehicle-registration", DocStatus.APPROVED),
            (DocType.VEHICLE_INSURANCE, f"{doc_url}?doc=vehicle-insurance", DocStatus.APPROVED),
        ]
        for doc_type, file_url, status in doc_fixtures:
            _upsert_document(db, driver.id, doc_type, file_url, status=status)

        haulier = _ensure_demo_haulier(db)
        today = date.today()

        booked_payload = {
            "haulier_id": haulier.id,
            "selected_supplier_id": driver.id,
            "load_code": "LOADB123",
            "pickup_address": "Andheri West, Mumbai, Maharashtra",
            "pickup_lat": 19.1197,
            "pickup_lng": 72.8468,
            "drop_address": "Navi Mumbai, Maharashtra",
            "drop_lat": 19.0330,
            "drop_lng": 73.0297,
            "goods_type": "General Cargo",
            "weight_kg": 1200.0,
            "vehicle_type": "VAN",
            "job_date": today + timedelta(days=2),
            "time_slot": TimeSlot.MORNING,
            "distance_km": 32.5,
            "duration_min": 75,
            "status": JobStatus.BOOKED,
        }
        completed_payload = {
            "haulier_id": haulier.id,
            "selected_supplier_id": driver.id,
            "load_code": "LOADC456",
            "pickup_address": "Bhiwandi Warehouse, Thane, Maharashtra",
            "pickup_lat": 19.2813,
            "pickup_lng": 73.0483,
            "drop_address": "Pune Logistics Hub, Maharashtra",
            "drop_lat": 18.5204,
            "drop_lng": 73.8567,
            "goods_type": "Industrial Supplies",
            "weight_kg": 1800.0,
            "vehicle_type": "VAN",
            "job_date": today - timedelta(days=3),
            "time_slot": TimeSlot.AFTERNOON,
            "distance_km": 146.2,
            "duration_min": 240,
            "status": JobStatus.COMPLETED,
        }

        booked_job = _upsert_job(db, job_ref="FF-DRV-BKD1", payload=booked_payload)
        completed_job = _upsert_job(db, job_ref="FF-DRV-CMP1", payload=completed_payload)
        db.flush()

        payment = (
            db.query(Payment)
            .filter(Payment.job_id == completed_job.id)
            .first()
        )
        if payment:
            payment.gateway_order_id = "demo_order_ff_completed"
            payment.amount = 1850.00
            payment.currency = "INR"
            payment.status = PaymentStatus.RELEASED
            payment.released_at = datetime.now(timezone.utc)
        else:
            db.add(
                Payment(
                    job_id=completed_job.id,
                    gateway_order_id="demo_order_ff_completed",
                    amount=1850.00,
                    currency="INR",
                    status=PaymentStatus.RELEASED,
                    released_at=datetime.now(timezone.utc),
                )
            )

        db.commit()

        print("Seeded demo driver data successfully.")
        print(f"Driver: {driver.full_name} ({driver.email})")
        print(f"Documents: {len(doc_fixtures)}")
        print("Jobs: 2 demo jobs created/updated")
        print(f"Booked job ref: {booked_job.job_ref}")
        print(f"Completed job ref: {completed_job.job_ref}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed demo profile photo, documents, and jobs for a driver."
    )
    parser.add_argument("--user-id", default=DEFAULT_DRIVER_ID, help="Target driver user ID.")
    parser.add_argument("--email", default=DEFAULT_DRIVER_EMAIL, help="Target driver email.")
    parser.add_argument(
        "--photo-url",
        default=DEFAULT_PROFILE_PHOTO_URL,
        help="Profile photo URL to store on the driver's profile.",
    )
    parser.add_argument(
        "--doc-url",
        default=DEFAULT_DOC_URL,
        help="Base URL used for the driver's dummy documents.",
    )
    args = parser.parse_args()

    seed_driver_demo_data(
        user_id=args.user_id,
        email=args.email,
        profile_photo_url=args.photo_url,
        doc_url=args.doc_url,
    )


if __name__ == "__main__":
    main()
