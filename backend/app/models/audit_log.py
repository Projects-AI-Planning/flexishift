from uuid import uuid4
from datetime import datetime

from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AuditLog(Base):
    """Every significant action — auth, payment, job, admin — gets a row here."""
    __tablename__ = "audit_logs"

    id:          Mapped[str]      = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id:     Mapped[str]      = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action:      Mapped[str]      = mapped_column(String(100), nullable=False, index=True)   # e.g. LOGIN, JOB_CREATED
    entity_type: Mapped[str]      = mapped_column(String(50),  nullable=True)                # e.g. job, payment
    entity_id:   Mapped[str]      = mapped_column(String(36),  nullable=True, index=True)
    old_value:   Mapped[dict]     = mapped_column(JSON, nullable=True)
    new_value:   Mapped[dict]     = mapped_column(JSON, nullable=True)
    ip_address:  Mapped[str]      = mapped_column(String(45),  nullable=True)                # IPv4 or IPv6
    user_agent:  Mapped[str]      = mapped_column(String(512), nullable=True)
    endpoint:    Mapped[str]      = mapped_column(String(255), nullable=True)
    method:      Mapped[str]      = mapped_column(String(10),  nullable=True)
    status_code: Mapped[int]      = mapped_column(Integer,     nullable=True)
    extra:       Mapped[dict]     = mapped_column(JSON, nullable=True)                       # any extra context
    created_at:  Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])  # type: ignore[name-defined]


class UserDevice(Base):
    """One row per unique device per user. Upserted on every login."""
    __tablename__ = "user_devices"

    id:             Mapped[str]      = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id:        Mapped[str]      = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id:      Mapped[str]      = mapped_column(String(255), nullable=True, index=True)  # Android ID / IDFV
    app_type:       Mapped[str]      = mapped_column(String(20),  nullable=True)              # android | ios | web
    app_version:    Mapped[str]      = mapped_column(String(30),  nullable=True)
    os_name:        Mapped[str]      = mapped_column(String(30),  nullable=True)              # Android | iOS | Windows
    os_version:     Mapped[str]      = mapped_column(String(30),  nullable=True)
    device_model:   Mapped[str]      = mapped_column(String(100), nullable=True)
    device_brand:   Mapped[str]      = mapped_column(String(50),  nullable=True)
    ip_address:     Mapped[str]      = mapped_column(String(45),  nullable=True)
    mac_address:    Mapped[str]      = mapped_column(String(17),  nullable=True)              # sent by client if available
    push_token:     Mapped[str]      = mapped_column(String(500), nullable=True)
    user_agent:     Mapped[str]      = mapped_column(String(512), nullable=True)
    last_seen_at:   Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])  # type: ignore[name-defined]
