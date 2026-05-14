from datetime import datetime, timezone, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import List, Optional

from app.config import settings
from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user
from app.models.local_upload import LocalUploadKind, LocalUploadStatus
from app.models.user import User
from app.services import local_storage as local_svc
from app.services import s3

router = APIRouter(prefix="/files", tags=["Files"])

ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/png", "image/webp",
    "application/pdf",
    "video/mp4",
}


def _blob_url(key: str) -> str:
    return (
        f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}"
        f".blob.core.windows.net/{settings.AZURE_CONTAINER_DOCS}/{key}"
    )


class UploadRequest(BaseModel):
    filename: str
    content_type: str = "application/octet-stream"
    folder: Optional[str] = "uploads"
    file_type: Optional[str] = Field(None, alias="fileType")
    model_config = {"populate_by_name": True}


class MultiUploadRequest(BaseModel):
    files: List[UploadRequest]
    file_type: Optional[str] = Field(None, alias="fileType")
    folder: Optional[str] = "uploads"
    model_config = {"populate_by_name": True}


@router.post("/upload", status_code=201)
def request_upload_url(
    body: UploadRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_id = f"fil_{str(uuid4())[:8]}"
    folder = body.folder or "uploads"
    key = f"{folder}/{current_user.id}/{file_id}/{body.filename}"
    if local_svc.azure_available():
        result = s3.generate_presigned_upload(settings.AZURE_CONTAINER_DOCS, key, body.content_type)
        upload_url = result.get("upload_url") or result.get("url")
        file_url = _blob_url(key)
    else:
        record = local_svc.create_pending_upload(
            db,
            user_id=current_user.id,
            kind=LocalUploadKind.FILE,
            original_name=body.filename,
            content_type=body.content_type,
            storage_key=key,
        )
        record.public_url = local_svc.local_upload_url(request, key)
        db.commit()
        upload_url = local_svc.local_upload_endpoint_url(request, record.upload_token)
        file_url = record.public_url
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    return created(
        data={
            "fileId": file_id,
            "fileName": body.filename,
            "fileType": body.file_type or "document",
            "mimeType": body.content_type,
            "folder": folder,
            "fileUrl": file_url,
            "key": key,
            "uploadUrl": upload_url,
            "upload_url": upload_url,
            "urlExpiresAt": expires_at,
            "uploadedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="File uploaded successfully.",
    )


@router.post("/upload-multiple", status_code=201)
def request_multiple_upload_urls(
    body: MultiUploadRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uploaded_files = []
    folder = body.folder or "uploads"
    for f in body.files:
        file_id = f"fil_{str(uuid4())[:8]}"
        key = f"{folder}/{current_user.id}/{file_id}/{f.filename}"
        if local_svc.azure_available():
            presigned = s3.generate_presigned_upload(settings.AZURE_CONTAINER_DOCS, key, f.content_type)
            upload_url = presigned.get("upload_url") or presigned.get("url")
            file_url = _blob_url(key)
        else:
            record = local_svc.create_pending_upload(
                db,
                user_id=current_user.id,
                kind=LocalUploadKind.FILE,
                original_name=f.filename,
                content_type=f.content_type,
                storage_key=key,
            )
            record.public_url = local_svc.local_upload_url(request, key)
            db.commit()
            upload_url = local_svc.local_upload_endpoint_url(request, record.upload_token)
            file_url = record.public_url
        uploaded_files.append({
            "fileId": file_id,
            "fileName": f.filename,
            "fileUrl": file_url,
            "uploadUrl": upload_url,
            "upload_url": upload_url,
        })
    return created(
        data={
            "uploadedFiles": uploaded_files,
            "totalUploaded": len(uploaded_files),
            "folder": folder,
            "uploadedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="Files uploaded successfully.",
    )


@router.get("/get/{file_key:path}")
def get_signed_url(
    file_key: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    if local_svc.azure_available():
        url = s3.generate_presigned_download(settings.AZURE_CONTAINER_DOCS, file_key)
    else:
        url = str(request.url_for("uploads", path=file_key))
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    filename = file_key.split("/")[-1]
    return ok(
        data={
            "fileId": file_key,
            "fileName": filename,
            "signedUrl": url,
            "urlExpiresAt": expires_at,
            "key": file_key,
        },
        message="Signed file URL generated successfully.",
    )


@router.delete("/delete/{file_key:path}")
def delete_file(
    file_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file_key.startswith(f"uploads/{current_user.id}/") and not file_key.startswith(f"documents/{current_user.id}/") and not file_key.startswith(f"images/{current_user.id}/"):
        raise HTTPException(status_code=403, detail="You can only delete your own files")

    if local_svc.azure_available():
        s3.delete_object(settings.AZURE_CONTAINER_DOCS, file_key)
    else:
        file_path = local_svc.LOCAL_UPLOAD_ROOT / file_key
        if file_path.exists():
            file_path.unlink()
        record = local_svc.get_upload_by_key(db, file_key, current_user.id)
        if record:
            record.status = LocalUploadStatus.DELETED
            db.commit()
    return ok(
        data={
            "fileId": file_key,
            "deletedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="File deleted successfully.",
    )
