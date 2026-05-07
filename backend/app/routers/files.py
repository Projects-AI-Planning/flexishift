from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from app.core.response import ok, created
from app.dependencies import get_current_user
from app.models.user import User
from app.services import s3
from app.config import settings

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
    current_user: User = Depends(get_current_user),
):
    file_id = f"fil_{str(uuid4())[:8]}"
    folder = body.folder or "uploads"
    key = f"{folder}/{current_user.id}/{file_id}/{body.filename}"
    result = s3.generate_presigned_upload(settings.AZURE_CONTAINER_DOCS, key, body.content_type)
    file_url = _blob_url(key)
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
            "uploadUrl": result.get("url"),
            "urlExpiresAt": expires_at,
            "uploadedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="File uploaded successfully.",
    )


@router.post("/upload-multiple", status_code=201)
def request_multiple_upload_urls(
    body: MultiUploadRequest,
    current_user: User = Depends(get_current_user),
):
    uploaded_files = []
    folder = body.folder or "uploads"
    for f in body.files:
        file_id = f"fil_{str(uuid4())[:8]}"
        key = f"{folder}/{current_user.id}/{file_id}/{f.filename}"
        presigned = s3.generate_presigned_upload(settings.AZURE_CONTAINER_DOCS, key, f.content_type)
        file_url = _blob_url(key)
        uploaded_files.append({
            "fileId": file_id,
            "fileName": f.filename,
            "fileUrl": file_url,
            "uploadUrl": presigned.get("url"),
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
    current_user: User = Depends(get_current_user),
):
    url = s3.generate_presigned_download(settings.AZURE_CONTAINER_DOCS, file_key)
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
    current_user: User = Depends(get_current_user),
):
    if not file_key.startswith(f"uploads/{current_user.id}/"):
        raise HTTPException(status_code=403, detail="You can only delete your own files")
    s3.delete_object(settings.AZURE_CONTAINER_DOCS, file_key)
    return ok(
        data={
            "fileId": file_key,
            "deletedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="File deleted successfully.",
    )
