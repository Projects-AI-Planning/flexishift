import enum
from uuid import uuid4
from datetime import datetime

from sqlalchemy import String, Enum, DECIMAL, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class QuoteStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SELECTED = "SELECTED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


class Quote(Base):
    __tablename__ = "quotes"

    id:          Mapped[str]         = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    job_id:      Mapped[str]         = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False)
    supplier_id: Mapped[str]         = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    price:       Mapped[float]       = mapped_column(DECIMAL(12, 2), nullable=False)
    currency:    Mapped[str]         = mapped_column(String(3), nullable=False, default="INR")
    status:      Mapped[QuoteStatus] = mapped_column(Enum(QuoteStatus), nullable=False, default=QuoteStatus.ACTIVE)
    created_at:  Mapped[datetime]    = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:  Mapped[datetime]    = mapped_column(DateTime, default=datetime.utcnow,
                                                     onupdate=datetime.utcnow)

    job:      Mapped["Job"]  = relationship("Job", back_populates="quotes")
    supplier: Mapped["User"] = relationship("User", back_populates="quotes")
