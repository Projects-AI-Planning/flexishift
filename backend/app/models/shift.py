import enum
import random
import string
from uuid import uuid4
from datetime import datetime, date

from sqlalchemy import String, Enum, DECIMAL, Integer, Boolean, Date, DateTime, Text, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ShiftStatus(str, enum.Enum):
    OPEN = "OPEN"
    BOOKED = "BOOKED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class RequirementType(str, enum.Enum):
    DRIVER_ONLY = "DRIVER_ONLY"
    TRUCK_WITH_DRIVER = "TRUCK_WITH_DRIVER"
    TRUCK_ONLY = "TRUCK_ONLY"


class ShiftQuoteStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


def _gen_shift_ref() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"SH-{suffix}"


class Shift(Base):
    __tablename__ = "shifts"

    id:                  Mapped[str]            = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    haulier_id:          Mapped[str]            = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    shift_ref:           Mapped[str]            = mapped_column(String(20), nullable=False, unique=True, default=_gen_shift_ref)
    requirement_type:    Mapped[RequirementType] = mapped_column(Enum(RequirementType), nullable=False)
    start_date:          Mapped[date]           = mapped_column(Date, nullable=False)
    end_date:            Mapped[date]           = mapped_column(Date, nullable=False)
    total_days:          Mapped[int]            = mapped_column(Integer, nullable=False)
    hours_per_day:       Mapped[int]            = mapped_column(Integer, nullable=False)
    pickup_address:      Mapped[str]            = mapped_column(Text, nullable=True)
    pickup_lat:          Mapped[float]          = mapped_column(DECIMAL(10, 7), nullable=True)
    pickup_lng:          Mapped[float]          = mapped_column(DECIMAL(10, 7), nullable=True)
    drop_address:        Mapped[str]            = mapped_column(Text, nullable=True)
    drop_lat:            Mapped[float]          = mapped_column(DECIMAL(10, 7), nullable=True)
    drop_lng:            Mapped[float]          = mapped_column(DECIMAL(10, 7), nullable=True)
    location:            Mapped[str]            = mapped_column(Text, nullable=True)
    goods_type:          Mapped[str]            = mapped_column(String(100), nullable=True)
    total_capacity:      Mapped[float]          = mapped_column(DECIMAL(10, 2), nullable=True)
    compartments:        Mapped[int]            = mapped_column(Integer, nullable=True)
    compartment_details: Mapped[list]           = mapped_column(JSON, nullable=True)
    stops:               Mapped[list]           = mapped_column(JSON, nullable=True)
    access_code:         Mapped[str]            = mapped_column(String(50), nullable=True)
    load_code:           Mapped[str]            = mapped_column(String(20), nullable=True)
    job_time:            Mapped[str]            = mapped_column(String(10), nullable=True)
    special_instructions:Mapped[str]            = mapped_column(Text, nullable=True)
    distance_km:         Mapped[float]          = mapped_column(DECIMAL(10, 2), nullable=True)
    duration_min:        Mapped[int]            = mapped_column(Integer, nullable=True)
    notes:               Mapped[str]            = mapped_column(Text, nullable=True)
    daily_rate:          Mapped[float]          = mapped_column(DECIMAL(10, 2), nullable=True)
    status:              Mapped[ShiftStatus]    = mapped_column(Enum(ShiftStatus), nullable=False, default=ShiftStatus.OPEN)
    selected_driver_id:  Mapped[str]            = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    days_completed:            Mapped[int]            = mapped_column(Integer, nullable=False, default=0)
    access_code_verified:      Mapped[bool]           = mapped_column(Boolean, nullable=False, default=False)
    handover_submitted:             Mapped[bool]           = mapped_column(Boolean, nullable=False, default=False)
    handover_checklist_data:        Mapped[dict | None]    = mapped_column(JSON, nullable=True)
    handover_photo_urls:            Mapped[list | None]    = mapped_column(JSON, nullable=True)
    handover_driver_signature:      Mapped[str | None]     = mapped_column(Text, nullable=True)
    handover_submitted_at:          Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    handover_haulier_signed:        Mapped[bool]           = mapped_column(Boolean, nullable=False, default=False)
    handover_haulier_signed_at:     Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    handover_haulier_signature_data: Mapped[str | None]    = mapped_column(Text, nullable=True)
    created_at:                     Mapped[datetime]       = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:                Mapped[datetime]       = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    haulier:  Mapped["User"]              = relationship("User", foreign_keys=[haulier_id])
    driver:   Mapped["User"]              = relationship("User", foreign_keys=[selected_driver_id])
    quotes:   Mapped[list["ShiftQuote"]]  = relationship("ShiftQuote", back_populates="shift")


class ShiftQuote(Base):
    __tablename__ = "shift_quotes"

    id:              Mapped[str]              = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    shift_id:        Mapped[str]              = mapped_column(String(36), ForeignKey("shifts.id"), nullable=False)
    driver_id:       Mapped[str]              = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    amount_per_day:  Mapped[float]            = mapped_column(DECIMAL(10, 2), nullable=False)
    total_amount:    Mapped[float]            = mapped_column(DECIMAL(10, 2), nullable=False)
    status:          Mapped[ShiftQuoteStatus] = mapped_column(Enum(ShiftQuoteStatus), nullable=False, default=ShiftQuoteStatus.PENDING)
    notes:           Mapped[str]             = mapped_column(Text, nullable=True)
    created_at:      Mapped[datetime]        = mapped_column(DateTime, default=datetime.utcnow)

    shift:  Mapped["Shift"] = relationship("Shift", back_populates="quotes")
    driver: Mapped["User"]  = relationship("User", foreign_keys=[driver_id])


# ── Shift Payment ──────────────────────────────────────────────────────────────

class ShiftPaymentStatus(str, enum.Enum):
    PENDING  = "PENDING"
    ESCROWED = "ESCROWED"
    RELEASED = "RELEASED"
    FAILED   = "FAILED"
    REFUNDED = "REFUNDED"


class ShiftPayment(Base):
    __tablename__ = "shift_payments"
    __table_args__ = (
        UniqueConstraint("shift_id", "day_number", name="uq_shift_day_payment"),
    )

    id:                  Mapped[str]                = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    shift_id:            Mapped[str]                = mapped_column(String(36), ForeignKey("shifts.id"), nullable=False)
    quote_id:            Mapped[str]                = mapped_column(String(36), ForeignKey("shift_quotes.id"), nullable=False)
    day_number:          Mapped[int]               = mapped_column(Integer, nullable=False, default=1)
    gateway_order_id:    Mapped[str]                = mapped_column(String(100), nullable=False)
    gateway_payment_id:  Mapped[str | None]         = mapped_column(String(100), nullable=True)
    amount:              Mapped[float]              = mapped_column(DECIMAL(12, 2), nullable=False)
    driver_amount:       Mapped[float | None]       = mapped_column(DECIMAL(12, 2), nullable=True)
    platform_fee:        Mapped[float | None]       = mapped_column(DECIMAL(12, 2), nullable=True)
    currency:            Mapped[str]                = mapped_column(String(3), nullable=False, default="USD")
    status:              Mapped[ShiftPaymentStatus] = mapped_column(Enum(ShiftPaymentStatus), nullable=False, default=ShiftPaymentStatus.PENDING)
    escrowed_at:         Mapped[datetime | None]    = mapped_column(DateTime, nullable=True)
    released_at:         Mapped[datetime | None]    = mapped_column(DateTime, nullable=True)
    created_at:          Mapped[datetime]           = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:          Mapped[datetime]           = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    shift: Mapped["Shift"]      = relationship("Shift")
    quote: Mapped["ShiftQuote"] = relationship("ShiftQuote")
