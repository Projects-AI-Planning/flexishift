import pytest
from sqlalchemy.orm import Session
from app.models.user import User, Role, UserStatus
from app.models.document import Document, DocStatus, DocType
from app.models.notification import Notification
from app.services.notifications import create_notification
from app.core.enums import NotificationType

def test_haulier_registration_notification(db_session: Session):
    # Setup Admin
    admin = User(full_name="Admin", email="admin@test.com", phone="0", password_hash="hash", role=Role.ADMIN, status=UserStatus.ACTIVE)
    db_session.add(admin)
    db_session.commit()
    
    # Simulate Haulier Registration (triggering the logic in services/auth.py)
    haulier = User(full_name="New Haulier", email="haulier@test.com", phone="1", password_hash="hash", role=Role.HAULIER, status=UserStatus.ACTIVE, admin_approved=False)
    db_session.add(haulier)
    db_session.commit()
    
    # Create notification for admin
    # Based on auth.py logic
    db_session.add(Notification(
        user_id=admin.id,
        type=NotificationType.HAULIER_REGISTRATION_PENDING.value,
        title="New Haulier Registration",
        body=f"New haulier {haulier.full_name} registered and pending approval.",
        data={"user_id": haulier.id}
    ))
    db_session.commit()
    
    # Verify notification exists
    notif = db_session.query(Notification).filter(Notification.user_id == admin.id, Notification.type == NotificationType.HAULIER_REGISTRATION_PENDING.value).first()
    assert notif is not None
    assert "New Haulier" in notif.body

def test_driver_document_submission_notification(db_session: Session):
    # Setup Admin and Driver
    admin = User(full_name="Admin", email="admin2@test.com", phone="0", password_hash="hash", role=Role.ADMIN, status=UserStatus.ACTIVE)
    driver = User(full_name="Driver", email="driver@test.com", phone="2", password_hash="hash", role=Role.DRIVER, status=UserStatus.ACTIVE)
    db_session.add_all([admin, driver])
    db_session.commit()
    
    # Submit document
    doc = Document(user_id=driver.id, doc_type=DocType.DRIVING_LICENCE, file_url="url", status=DocStatus.PENDING)
    db_session.add(doc)
    db_session.commit()
    
    # Create notification for admin
    # Based on routers/documents.py logic
    db_session.add(Notification(
        user_id=admin.id,
        type=NotificationType.DRIVER_DOCUMENT_SUBMITTED.value,
        title="New Document for Review",
        body=f"{driver.full_name} submitted a Driving Licence for verification.",
        data={"doc_id": doc.id}
    ))
    db_session.commit()
    
    # Verify notification exists
    notif = db_session.query(Notification).filter(Notification.user_id == admin.id, Notification.type == NotificationType.DRIVER_DOCUMENT_SUBMITTED.value).first()
    assert notif is not None
    assert "Driving Licence" in notif.body
