import enum
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class LocalUploadKind(str, enum.Enum):
    DOCUMENT = "DOCUMENT"
    IMAGE = "IMAGE"
    FILE = "FILE"


class LocalUploadStatus(str, enum.Enum):
    PENDING = "PENDING"
    STORED = "STORED"
    DELETED = "DELETED"


class LocalUpload(Base):
    __tablename__ = "local_uploads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    upload_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    storage_key: Mapped[str] = mapped_column(String(600), unique=True, nullable=False, index=True)
    kind: Mapped[LocalUploadKind] = mapped_column(Enum(LocalUploadKind), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)
    local_path: Mapped[str] = mapped_column(Text, nullable=False)
    public_url: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[LocalUploadStatus] = mapped_column(
        Enum(LocalUploadStatus), nullable=False, default=LocalUploadStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    user = relationship("User")
