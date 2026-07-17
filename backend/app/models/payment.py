import enum
from uuid import uuid4
from datetime import datetime, timezone

from sqlalchemy import String, Enum, DECIMAL, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    ESCROWED = "ESCROWED"
    RELEASED = "RELEASED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class Payment(Base):
    __tablename__ = "payments"

    id:                 Mapped[str]           = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    job_id:             Mapped[str]           = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False, unique=True)
    gateway_order_id:   Mapped[str]           = mapped_column(String(100), nullable=False)
    gateway_payment_id: Mapped[str]           = mapped_column(String(100), nullable=True)
    gateway_payout_id:  Mapped[str]           = mapped_column(String(100), nullable=True)
    amount:             Mapped[float]         = mapped_column(DECIMAL(12, 2), nullable=False)
    currency:           Mapped[str]           = mapped_column(String(3), nullable=False, default="INR")
    status:             Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING)
    escrowed_at:        Mapped[datetime]      = mapped_column(DateTime, nullable=True)
    released_at:        Mapped[datetime]      = mapped_column(DateTime, nullable=True)
    created_at:         Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:         Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow,
                                                               onupdate=datetime.utcnow)

    job: Mapped["Job"] = relationship("Job", back_populates="payment")


class PaymentEvent(Base):
    __tablename__ = "payment_events"

    id:               Mapped[str]      = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    gateway_event_id: Mapped[str]      = mapped_column(String(100), nullable=False, unique=True)
    event_type:       Mapped[str]      = mapped_column(String(100), nullable=False)
    processed_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
