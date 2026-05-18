from uuid import uuid4
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ComplianceRecord(Base):
    __tablename__ = "compliance_records"

    id:                      Mapped[str]      = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    job_id:                  Mapped[str]      = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False, unique=True)
    load_code_verified_at:   Mapped[datetime] = mapped_column(DateTime, nullable=True)
    step1_completed_at:      Mapped[datetime] = mapped_column(DateTime, nullable=True)
    checklist_data:          Mapped[dict]     = mapped_column(JSON, nullable=True)
    condition_photo_urls:    Mapped[list]     = mapped_column(JSON, nullable=True)
    driver_signature_url:    Mapped[str]      = mapped_column(Text, nullable=True)
    driver_signed_at:        Mapped[datetime] = mapped_column(DateTime, nullable=True)
    haulier_signature_url:   Mapped[str]      = mapped_column(Text, nullable=True)
    haulier_signed_at:       Mapped[datetime] = mapped_column(DateTime, nullable=True)
    step2_completed_at:      Mapped[datetime] = mapped_column(DateTime, nullable=True)
    delivery_photo_url:      Mapped[str]      = mapped_column(Text, nullable=True)
    recipient_signature_url: Mapped[str]      = mapped_column(Text, nullable=True)
    delivery_notes:          Mapped[str]      = mapped_column(Text, nullable=True)
    delivery_submitted_at:   Mapped[datetime] = mapped_column(DateTime, nullable=True)
    step3_approved_at:       Mapped[datetime] = mapped_column(DateTime, nullable=True)
    dispute_reason:          Mapped[str]      = mapped_column(Text, nullable=True)
    disputed_at:             Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at:              Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:              Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow,
                                                               onupdate=datetime.utcnow)

    job: Mapped["Job"] = relationship("Job", back_populates="compliance")
