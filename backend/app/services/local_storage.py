from pathlib import Path
from uuid import uuid4

from sqlalchemy.orm import Session

from app.config import settings
from app.models.local_upload import LocalUpload, LocalUploadKind, LocalUploadStatus

LOCAL_UPLOAD_ROOT = Path(__file__).resolve().parents[1] / "static" / "uploads"


def azure_available() -> bool:
    return bool(settings.AZURE_STORAGE_ACCOUNT_NAME and settings.AZURE_STORAGE_ACCOUNT_KEY)


def ensure_local_upload_root() -> Path:
    LOCAL_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    (LOCAL_UPLOAD_ROOT / "documents").mkdir(parents=True, exist_ok=True)
    (LOCAL_UPLOAD_ROOT / "images").mkdir(parents=True, exist_ok=True)
    (LOCAL_UPLOAD_ROOT / "files").mkdir(parents=True, exist_ok=True)
    return LOCAL_UPLOAD_ROOT


def build_storage_key(kind: LocalUploadKind, user_id: str, file_name: str) -> str:
    safe_name = Path(file_name).name or "file"
    file_id = uuid4().hex[:12]
    prefix = "documents" if kind == LocalUploadKind.DOCUMENT else "images" if kind == LocalUploadKind.IMAGE else "files"
    return f"{prefix}/{user_id}/{file_id}/{safe_name}"


def create_pending_upload(
    db: Session,
    *,
    user_id: str,
    kind: LocalUploadKind,
    original_name: str,
    content_type: str,
    storage_key: str | None = None,
) -> LocalUpload:
    ensure_local_upload_root()
    storage_key = storage_key or build_storage_key(kind, user_id, original_name)
    local_path = str(LOCAL_UPLOAD_ROOT / storage_key)
    record = LocalUpload(
        user_id=user_id,
        upload_token=uuid4().hex,
        storage_key=storage_key,
        kind=kind,
        original_name=Path(original_name).name or "file",
        content_type=content_type,
        local_path=local_path,
        public_url="",
        status=LocalUploadStatus.PENDING,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def store_upload_bytes(db: Session, upload_token: str, data: bytes, content_type: str | None = None) -> LocalUpload:
    ensure_local_upload_root()
    record = db.query(LocalUpload).filter(LocalUpload.upload_token == upload_token).first()
    if not record:
        raise ValueError("Upload token not found")
    file_path = Path(record.local_path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(data)
    if content_type:
        record.content_type = content_type
    record.status = LocalUploadStatus.STORED
    db.commit()
    db.refresh(record)
    return record


def mark_upload_deleted(db: Session, storage_key: str) -> None:
    record = db.query(LocalUpload).filter(LocalUpload.storage_key == storage_key).first()
    if not record:
        return
    record.status = LocalUploadStatus.DELETED
    db.commit()


def get_upload_by_key(db: Session, storage_key: str, user_id: str | None = None) -> LocalUpload | None:
    query = db.query(LocalUpload).filter(LocalUpload.storage_key == storage_key)
    if user_id:
        query = query.filter(LocalUpload.user_id == user_id)
    return query.first()


def local_upload_url(request, storage_key: str) -> str:
    ensure_local_upload_root()
    return str(request.url_for("uploads", path=storage_key))


def local_upload_endpoint_url(request, upload_token: str) -> str:
    return str(request.url_for("local_storage_upload", upload_token=upload_token))
