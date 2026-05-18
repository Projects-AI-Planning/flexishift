from uuid import uuid4
from datetime import datetime, timezone

from sqlalchemy import String, DECIMAL, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TrackingPoint(Base):
    __tablename__ = "tracking_points"

    id:          Mapped[str]      = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    job_id:      Mapped[str]      = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False)
    lat:         Mapped[float]    = mapped_column(DECIMAL(10, 7), nullable=False)
    lng:         Mapped[float]    = mapped_column(DECIMAL(10, 7), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at:  Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    job: Mapped["Job"] = relationship("Job", back_populates="tracking")
