import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date, datetime

from app.database import Base
from app.models.user import User, Role, UserStatus, UserProfile
from app.models.job import Job, JobStatus, TimeSlot
from app.models.document import Document, DocType, DocStatus
from app.services.jobs import list_jobs

@pytest.fixture(name="db")
def db_fixture():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_list_jobs_filters_by_driver_country(db):
    # 1. Create a Haulier to post jobs
    haulier = User(
        id="haulier-1",
        full_name="UK Haulier",
        email="haulier@example.com",
        phone="+447911123456",
        password_hash="hashed",
        role=Role.HAULIER,
        status=UserStatus.ACTIVE,
        country="GB"
    )
    db.add(haulier)

    # 2. Create a Swedish Driver
    se_driver = User(
        id="driver-se",
        full_name="Swedish Driver",
        email="driver.se@example.com",
        phone="+46701234567",
        password_hash="hashed",
        role=Role.DRIVER,
        status=UserStatus.ACTIVE,
        country="SE"
    )
    db.add(se_driver)

    # Create Swedish Driver profile with DRIVER_ONLY availability
    se_profile = UserProfile(
        id="profile-se",
        user_id="driver-se",
        driver_availability="DRIVER_ONLY"
    )
    db.add(se_profile)

    # Approve driving licence document for Swedish Driver
    se_licence = Document(
        id="doc-se-licence",
        user_id="driver-se",
        doc_type=DocType.DRIVING_LICENCE,
        file_url="http://example.com/se.jpg",
        status=DocStatus.APPROVED
    )
    db.add(se_licence)

    # 3. Create a UK Driver
    gb_driver = User(
        id="driver-gb",
        full_name="UK Driver",
        email="driver.gb@example.com",
        phone="+447911123457",
        password_hash="hashed",
        role=Role.DRIVER,
        status=UserStatus.ACTIVE,
        country="GB"
    )
    db.add(gb_driver)

    # Create UK Driver profile with DRIVER_ONLY availability
    gb_profile = UserProfile(
        id="profile-gb",
        user_id="driver-gb",
        driver_availability="DRIVER_ONLY"
    )
    db.add(gb_profile)

    # Approve driving licence document for UK Driver
    gb_licence = Document(
        id="doc-gb-licence",
        user_id="driver-gb",
        doc_type=DocType.DRIVING_LICENCE,
        file_url="http://example.com/gb.jpg",
        status=DocStatus.APPROVED
    )
    db.add(gb_licence)

    # 4. Create Sweden and UK Jobs
    se_job = Job(
        id="job-se",
        haulier_id="haulier-1",
        country="SE",
        job_ref="FF-SE123456",
        load_code="LOADSE",
        pickup_address="Stockholm",
        pickup_lat=59.3293,
        pickup_lng=18.0686,
        drop_address="Gothenburg",
        drop_lat=57.7089,
        drop_lng=11.9746,
        goods_type="General",
        job_date=date.today(),
        time_slot=TimeSlot.MORNING,
        driver_requirement="DRIVER_ONLY",
        status=JobStatus.OPEN
    )
    db.add(se_job)

    gb_job = Job(
        id="job-gb",
        haulier_id="haulier-1",
        country="GB",
        job_ref="FF-GB123456",
        load_code="LOADGB",
        pickup_address="London",
        pickup_lat=51.5074,
        pickup_lng=-0.1278,
        drop_address="Manchester",
        drop_lat=53.4808,
        drop_lng=-2.2426,
        goods_type="General",
        job_date=date.today(),
        time_slot=TimeSlot.MORNING,
        driver_requirement="DRIVER_ONLY",
        status=JobStatus.OPEN
    )
    db.add(gb_job)

    db.commit()

    # 5. List jobs for Swedish driver - should only return the Sweden job
    se_result = list_jobs(db, se_driver)
    assert se_result["total"] == 1
    assert se_result["items"][0].id == "job-se"

    # 6. List jobs for UK driver - should only return the UK job
    gb_result = list_jobs(db, gb_driver)
    assert gb_result["total"] == 1
    assert gb_result["items"][0].id == "job-gb"
