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


class UploadRequest(BaseModel):
    filename: str
    content_type: str = "application/octet-stream"
    folder: Optional[str] = "uploads"


class MultiUploadRequest(BaseModel):
    files: List[UploadRequest]


@router.post("/upload", status_code=201)
def request_upload_url(
    body: UploadRequest,
    current_user: User = Depends(get_current_user),
):
    key = f"{body.folder}/{current_user.id}/{uuid4()}/{body.filename}"
    result = s3.generate_presigned_upload(settings.AWS_S3_BUCKET_DOCS, key, body.content_type)
    file_url = f"https://{settings.AWS_S3_BUCKET_DOCS}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
    return created(data={**result, "fileUrl": file_url, "key": key}, message="Upload URL generated")


@router.post("/upload-multiple", status_code=201)
def request_multiple_upload_urls(
    body: MultiUploadRequest,
    current_user: User = Depends(get_current_user),
):
    results = []
    for f in body.files:
        key = f"{f.folder or 'uploads'}/{current_user.id}/{uuid4()}/{f.filename}"
        presigned = s3.generate_presigned_upload(settings.AWS_S3_BUCKET_DOCS, key, f.content_type)
        file_url = f"https://{settings.AWS_S3_BUCKET_DOCS}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
        results.append({**presigned, "fileUrl": file_url, "filename": f.filename})
    return created(data={"files": results, "total": len(results)}, message="Upload URLs generated")


@router.get("/get/{file_key:path}")
def get_signed_url(
    file_key: str,
    current_user: User = Depends(get_current_user),
):
    url = s3.generate_presigned_download(settings.AWS_S3_BUCKET_DOCS, file_key)
    return ok(data={"signedUrl": url, "key": file_key}, message="Signed URL generated")


@router.delete("/delete/{file_key:path}")
def delete_file(
    file_key: str,
    current_user: User = Depends(get_current_user),
):
    if not file_key.startswith(f"uploads/{current_user.id}/"):
        raise HTTPException(status_code=403, detail="You can only delete your own files")
    s3.delete_object(settings.AWS_S3_BUCKET_DOCS, file_key)
    return ok(data=None, message="File deleted")
