from uuid import uuid4
from datetime import datetime, date, time, timezone

from sqlalchemy import String, Boolean, SmallInteger, Date, Time, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id:          Mapped[str]  = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    driver_id:   Mapped[str]  = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    day_of_week: Mapped[int]  = mapped_column(SmallInteger, nullable=False)
    start_time:  Mapped[time] = mapped_column(Time, nullable=False)
    end_time:    Mapped[time] = mapped_column(Time, nullable=False)
    is_active:   Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at:  Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AvailabilityBlock(Base):
    __tablename__ = "availability_blocks"

    id:          Mapped[str]  = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    driver_id:   Mapped[str]  = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    block_start: Mapped[date] = mapped_column(Date, nullable=False)
    block_end:   Mapped[date] = mapped_column(Date, nullable=False)
    reason:      Mapped[str]  = mapped_column(Text, nullable=True)
    created_at:  Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
