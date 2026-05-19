import enum
from uuid import uuid4
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, Enum, DECIMAL, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Role(str, enum.Enum):
    DRIVER = "DRIVER"
    HAULIER = "HAULIER"
    FIRM = "FIRM"
    ADMIN = "ADMIN"


class UserStatus(str, enum.Enum):
    INACTIVE = "INACTIVE"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"


class User(Base):
    __tablename__ = "users"

    id:               Mapped[str]   = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    full_name:        Mapped[str]   = mapped_column(String(200), nullable=False)
    email:            Mapped[str]   = mapped_column(String(320), nullable=False, unique=True)
    phone:            Mapped[str]   = mapped_column(String(20), nullable=False)
    password_hash:    Mapped[str]   = mapped_column(String(60), nullable=False)
    role:             Mapped[Role]  = mapped_column(Enum(Role), nullable=False)
    status:           Mapped[UserStatus] = mapped_column(Enum(UserStatus), nullable=False, default=UserStatus.INACTIVE)
    profile_complete: Mapped[bool]  = mapped_column(Boolean, nullable=False, default=False)
    verified:         Mapped[bool]  = mapped_column(Boolean, nullable=False, default=False)
    avg_rating:       Mapped[float] = mapped_column(DECIMAL(3, 2), default=0.00)
    completed_jobs:   Mapped[int]   = mapped_column(Integer, default=0)
    location_lat:     Mapped[float] = mapped_column(DECIMAL(10, 7), nullable=True)
    location_lng:     Mapped[float] = mapped_column(DECIMAL(10, 7), nullable=True)
    bank_account_id:  Mapped[str]   = mapped_column(String(100), nullable=True)
    push_token:       Mapped[str]   = mapped_column(String(500), nullable=True)
    created_at:       Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:       Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow,
                                                        onupdate=datetime.utcnow)
    deleted_at:       Mapped[datetime] = mapped_column(DateTime, nullable=True)

    profile:          Mapped["UserProfile"]        = relationship("UserProfile", back_populates="user", uselist=False)
    documents:        Mapped[list["Document"]]     = relationship("Document", foreign_keys="[Document.user_id]", back_populates="user")
    jobs_posted:      Mapped[list["Job"]]          = relationship("Job", foreign_keys="Job.haulier_id", back_populates="haulier")
    quotes:           Mapped[list["Quote"]]        = relationship("Quote", back_populates="supplier")
    ratings_given:    Mapped[list["Rating"]]       = relationship("Rating", foreign_keys="Rating.rater_id", back_populates="rater")
    ratings_received: Mapped[list["Rating"]]       = relationship("Rating", foreign_keys="Rating.rated_id", back_populates="rated")
    notifications:    Mapped[list["Notification"]] = relationship("Notification", back_populates="user")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id:                   Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id:              Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    photo_url:            Mapped[str] = mapped_column(String(500), nullable=True)
    licence_number:       Mapped[str] = mapped_column(String(50), nullable=True)
    vehicle_type:         Mapped[str] = mapped_column(String(50), nullable=True)
    vehicle_registration: Mapped[str] = mapped_column(String(20), nullable=True)
    company_name:         Mapped[str] = mapped_column(String(200), nullable=True)
    company_address:      Mapped[str] = mapped_column(String(500), nullable=True)
    coverage_area:        Mapped[str] = mapped_column(String(500), nullable=True)
    driver_availability:  Mapped[str] = mapped_column(String(50), nullable=True)
    equipment_details:    Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    driver_assignments:   Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    created_at:           Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:           Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow,
                                                            onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="profile")


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id:         Mapped[str]      = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id:    Mapped[str]      = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str]      = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used_at:    Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id:         Mapped[str]      = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id:    Mapped[str]      = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str]      = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used_at:    Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id:         Mapped[str]      = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id:    Mapped[str]      = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str]      = mapped_column(String(64), nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked:    Mapped[bool]     = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
