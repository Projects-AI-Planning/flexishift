import enum
from uuid import uuid4
from datetime import datetime, date

from sqlalchemy import String, Enum, DECIMAL, Integer, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class JobStatus(str, enum.Enum):
    OPEN = "OPEN"
    BOOKED = "BOOKED"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAYMENT_SECURED = "PAYMENT_SECURED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERY_SUBMITTED = "DELIVERY_SUBMITTED"
    COMPLETED = "COMPLETED"
    DISPUTED = "DISPUTED"
    CANCELLED = "CANCELLED"


class TimeSlot(str, enum.Enum):
    MORNING = "MORNING"
    AFTERNOON = "AFTERNOON"
    EVENING = "EVENING"
    FULL_DAY = "FULL_DAY"


class Job(Base):
    __tablename__ = "jobs"

    id:                   Mapped[str]       = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    haulier_id:           Mapped[str]       = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    job_ref:              Mapped[str]       = mapped_column(String(20), nullable=False, unique=True)
    load_code:            Mapped[str]       = mapped_column(String(10), nullable=False)
    pickup_address:       Mapped[str]       = mapped_column(Text, nullable=False)
    pickup_lat:           Mapped[float]     = mapped_column(DECIMAL(10, 7), nullable=False)
    pickup_lng:           Mapped[float]     = mapped_column(DECIMAL(10, 7), nullable=False)
    drop_address:         Mapped[str]       = mapped_column(Text, nullable=False)
    drop_lat:             Mapped[float]     = mapped_column(DECIMAL(10, 7), nullable=False)
    drop_lng:             Mapped[float]     = mapped_column(DECIMAL(10, 7), nullable=False)
    goods_type:           Mapped[str]       = mapped_column(String(100), nullable=False)
    weight_kg:            Mapped[float]     = mapped_column(DECIMAL(10, 2), nullable=False)
    vehicle_type:         Mapped[str]       = mapped_column(String(50), nullable=False)
    driver_requirement:   Mapped[str]       = mapped_column(String(50), nullable=True, default="DRIVER_WITH_TRUCK")
    job_date:             Mapped[date]      = mapped_column(Date, nullable=False)
    time_slot:            Mapped[TimeSlot]  = mapped_column(Enum(TimeSlot), nullable=False)
    distance_km:          Mapped[float]     = mapped_column(DECIMAL(10, 2), nullable=True)
    duration_min:         Mapped[int]       = mapped_column(Integer, nullable=True)
    status:               Mapped[JobStatus] = mapped_column(Enum(JobStatus), nullable=False, default=JobStatus.OPEN)
    selected_supplier_id: Mapped[str]       = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    original_eta:         Mapped[datetime]  = mapped_column(DateTime, nullable=True)
    invoice_url:          Mapped[str]       = mapped_column(String(500), nullable=True)
    created_at:           Mapped[datetime]  = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:           Mapped[datetime]  = mapped_column(DateTime, default=datetime.utcnow,
                                                             onupdate=datetime.utcnow)
    deleted_at:           Mapped[datetime]  = mapped_column(DateTime, nullable=True)

    haulier:    Mapped["User"]              = relationship("User", foreign_keys=[haulier_id], back_populates="jobs_posted")
    supplier:   Mapped["User"]              = relationship("User", foreign_keys=[selected_supplier_id])
    quotes:     Mapped[list["Quote"]]       = relationship("Quote", back_populates="job")
    payment:    Mapped["Payment"]           = relationship("Payment", back_populates="job", uselist=False)
    compliance: Mapped["ComplianceRecord"]  = relationship("ComplianceRecord", back_populates="job", uselist=False)
    tracking:   Mapped[list["TrackingPoint"]] = relationship("TrackingPoint", back_populates="job")
    ratings:    Mapped[list["Rating"]]      = relationship("Rating", back_populates="job")
