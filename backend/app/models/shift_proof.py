from uuid import uuid4
from datetime import datetime

from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ShiftDayProof(Base):
    __tablename__ = "shift_day_proofs"
    __table_args__ = (
        UniqueConstraint("shift_id", "day_number", name="uq_shift_day_proof"),
    )

    id:               Mapped[str]            = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    shift_id:         Mapped[str]            = mapped_column(String(36), ForeignKey("shifts.id"), nullable=False)
    day_number:       Mapped[int]            = mapped_column(Integer, nullable=False)
    driver_id:        Mapped[str]            = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    notes:            Mapped[str | None]     = mapped_column(Text, nullable=True)
    recipient_name:   Mapped[str | None]     = mapped_column(String(255), nullable=True)
    proof_photo_url:  Mapped[str | None]     = mapped_column(Text, nullable=True)
    signature_data:   Mapped[str | None]     = mapped_column(Text, nullable=True)
    submitted_at:     Mapped[datetime]       = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    created_at:       Mapped[datetime]       = mapped_column(DateTime, default=datetime.utcnow)
