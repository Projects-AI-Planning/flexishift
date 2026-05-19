import enum
from uuid import uuid4
from datetime import datetime, timezone

from sqlalchemy import String, Enum, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DocType(str, enum.Enum):
    DRIVING_LICENCE = "DRIVING_LICENCE"
    VEHICLE_REG = "VEHICLE_REG"
    VEHICLE_INSURANCE = "VEHICLE_INSURANCE"
    COMPANY_REG = "COMPANY_REG"
    FLEET_INSURANCE = "FLEET_INSURANCE"


class DocStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Document(Base):
    __tablename__ = "documents"

    id:               Mapped[str]      = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id:          Mapped[str]      = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    doc_type:         Mapped[DocType]  = mapped_column(Enum(DocType), nullable=False)
    file_url:         Mapped[str]      = mapped_column(String(500), nullable=False)
    status:           Mapped[DocStatus]= mapped_column(Enum(DocStatus), nullable=False, default=DocStatus.PENDING)
    reviewed_by:      Mapped[str]      = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    rejection_reason: Mapped[str]      = mapped_column(Text, nullable=True)
    reviewed_at:      Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at:       Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:       Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow,
                                                        onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="documents")
