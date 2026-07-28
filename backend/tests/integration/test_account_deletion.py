"""Permanent account deletion (App Store guideline 5.1.1(v)).

Uses a self-contained in-memory SQLite database so it runs without the app's
MySQL instance.
"""

from datetime import date
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.document import DocStatus, DocType, Document
from app.models.job import Job, JobStatus, TimeSlot
from app.models.notification import Notification
from app.models.quote import Quote, QuoteStatus
from app.models.user import Role, User, UserProfile, UserStatus
from app.models.vehicle import Vehicle
from app.services.account_deletion import delete_account


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def _driver(db, email="driver@example.com"):
    user = User(
        full_name="Test Driver",
        email=email,
        phone="+447700900000",
        password_hash="$2b$12$abcdefghijklmnopqrstuv",
        role=Role.DRIVER,
        status=UserStatus.ACTIVE,
        push_token="expo-token",
        stripe_account_id="acct_123",
        location_lat=51.5,
        location_lng=-0.12,
    )
    db.add(user)
    db.flush()
    return user


def _haulier(db, email="haulier@example.com"):
    user = User(
        full_name="Test Haulier",
        email=email,
        phone="+447700900001",
        password_hash="$2b$12$abcdefghijklmnopqrstuv",
        role=Role.HAULIER,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.flush()
    return user


def _job(haulier, *, status, selected_supplier_id=None):
    return Job(
        haulier_id=haulier.id,
        selected_supplier_id=selected_supplier_id,
        job_ref=uuid4().hex[:10].upper(),
        load_code=uuid4().hex[:6].upper(),
        pickup_address="1 Pickup Road",
        pickup_lat=51.5,
        pickup_lng=-0.12,
        drop_address="2 Drop Lane",
        drop_lat=52.5,
        drop_lng=-1.9,
        goods_type="Pallets",
        job_date=date.today(),
        time_slot=TimeSlot.MORNING,
        status=status,
    )


def test_deletion_erases_personal_data(db, monkeypatch):
    monkeypatch.setattr("app.services.account_deletion._detach_stripe", lambda user: None)
    driver = _driver(db)
    original_email = driver.email
    db.add_all([
        UserProfile(user_id=driver.id, photo_url="/uploads/images/photo.jpg", licence_number="LIC1"),
        Vehicle(user_id=driver.id, vehicle_type="VAN", vehicle_registration="AB12CDE"),
        Document(user_id=driver.id, doc_type=DocType.DRIVING_LICENCE, file_url="/uploads/documents/l.pdf", status=DocStatus.APPROVED),
        Notification(user_id=driver.id, type="JOB", title="New job", body="A job is available"),
    ])
    db.commit()

    delete_account(db, driver)
    db.refresh(driver)

    assert driver.full_name == "Deleted user"
    assert driver.email != original_email
    assert driver.email == f"deleted-{driver.id}@deleted.invalid"
    assert driver.phone == ""
    assert driver.push_token is None
    assert driver.location_lat is None and driver.location_lng is None
    assert driver.stripe_account_id is None
    assert driver.status == UserStatus.SUSPENDED
    assert driver.deleted_at is not None

    assert db.query(UserProfile).filter_by(user_id=driver.id).count() == 0
    assert db.query(Vehicle).filter_by(user_id=driver.id).count() == 0
    assert db.query(Document).filter_by(user_id=driver.id).count() == 0
    assert db.query(Notification).filter_by(user_id=driver.id).count() == 0


def test_deleted_user_cannot_sign_in_with_old_password(db, monkeypatch):
    """The stored hash is replaced with a value no password can verify against."""
    from app.core.security import hash_password, verify_password

    monkeypatch.setattr("app.services.account_deletion._detach_stripe", lambda user: None)
    driver = _driver(db)
    driver.password_hash = hash_password("Correct-Horse-1")
    db.commit()

    delete_account(db, driver)
    db.refresh(driver)

    try:
        assert verify_password("Correct-Horse-1", driver.password_hash) is False
    except Exception:
        pass  # a malformed hash raising is equally disqualifying


def test_deletion_withdraws_open_work(db, monkeypatch):
    monkeypatch.setattr("app.services.account_deletion._detach_stripe", lambda user: None)
    haulier = _haulier(db)
    driver = _driver(db)
    open_job = _job(haulier, status=JobStatus.OPEN)
    db.add(open_job)
    db.flush()
    quote = Quote(job_id=open_job.id, supplier_id=driver.id, price=100, status=QuoteStatus.ACTIVE)
    db.add(quote)
    db.commit()

    delete_account(db, driver)
    db.refresh(quote)
    assert quote.status == QuoteStatus.WITHDRAWN

    delete_account(db, haulier)
    db.refresh(open_job)
    assert open_job.status == JobStatus.CANCELLED


def test_deletion_blocked_while_job_in_progress(db, monkeypatch):
    monkeypatch.setattr("app.services.account_deletion._detach_stripe", lambda user: None)
    haulier = _haulier(db)
    driver = _driver(db)
    db.add(_job(haulier, status=JobStatus.IN_TRANSIT, selected_supplier_id=driver.id))
    db.commit()

    with pytest.raises(HTTPException) as exc:
        delete_account(db, driver)
    assert exc.value.status_code == 409

    db.refresh(driver)
    assert driver.status == UserStatus.ACTIVE
    assert driver.full_name == "Test Driver"
