import enum
from uuid import uuid4
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id:                   Mapped[str]  = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id:              Mapped[str]  = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_type:         Mapped[str]  = mapped_column(String(50), nullable=True)
    vehicle_registration: Mapped[str]  = mapped_column(String(20), nullable=True)
    truck_capacity:       Mapped[str]  = mapped_column(String(100), nullable=True)
    equipment_details:    Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    is_active:            Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at:           Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:           Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user:      Mapped["User"]           = relationship("User", back_populates="vehicles")
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="vehicle")
