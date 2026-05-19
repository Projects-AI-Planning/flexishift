from uuid import uuid4
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id:         Mapped[str]      = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id:    Mapped[str]      = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    type:       Mapped[str]      = mapped_column(String(50), nullable=False)
    title:      Mapped[str]      = mapped_column(String(200), nullable=False)
    body:       Mapped[str]      = mapped_column(Text, nullable=False)
    data:       Mapped[dict]     = mapped_column(JSON, nullable=True)
    read_at:    Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="notifications")
