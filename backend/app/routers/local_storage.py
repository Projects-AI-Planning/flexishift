from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.response import created
from app.database import get_db
from app.services import local_storage as local_svc

router = APIRouter(prefix="/local-storage", tags=["Local Storage"])


@router.put("/uploads/{upload_token}", name="local_storage_upload")
async def store_local_upload(
    upload_token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    body = await request.body()
    content_type = request.headers.get("content-type") or "application/octet-stream"
    try:
        record = local_svc.store_upload_bytes(db, upload_token, body, content_type=content_type)
    except ValueError:
        raise HTTPException(status_code=404, detail="Upload token not found")

    record.public_url = str(request.url_for("uploads", path=record.storage_key))
    db.commit()
    db.refresh(record)

    return created(
        data={
            "uploadToken": record.upload_token,
            "key": record.storage_key,
            "fileUrl": record.public_url,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="Local upload stored successfully",
    )
