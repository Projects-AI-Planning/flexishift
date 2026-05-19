from uuid import uuid4
from datetime import datetime, timezone

from sqlalchemy import String, SmallInteger, Text, DateTime, ForeignKey, CheckConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Rating(Base):
    __tablename__ = "ratings"
    __table_args__ = (CheckConstraint("stars BETWEEN 1 AND 5", name="ck_rating_stars"),)

    id:          Mapped[str]      = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    job_id:      Mapped[str]      = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False)
    rater_id:    Mapped[str]      = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    rated_id:    Mapped[str]      = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    stars:       Mapped[int]      = mapped_column(SmallInteger, nullable=False)
    review_text: Mapped[str]      = mapped_column(Text, nullable=True)
    tags:        Mapped[list]     = mapped_column(JSON, nullable=True)
    created_at:  Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    job:   Mapped["Job"]  = relationship("Job", back_populates="ratings")
    rater: Mapped["User"] = relationship("User", foreign_keys=[rater_id], back_populates="ratings_given")
    rated: Mapped["User"] = relationship("User", foreign_keys=[rated_id], back_populates="ratings_received")
