from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import settings
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
    try:
        record = local_svc.get_upload_by_token(db, upload_token)
    except ValueError:
        raise HTTPException(status_code=404, detail="Upload token not found")

    file_path = Path(record.local_path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(file_path, "wb") as f:
        async for chunk in request.stream():
            f.write(chunk)
            
    content_type = request.headers.get("content-type") or "application/octet-stream"
    record.content_type = content_type
    record.status = LocalUploadStatus.STORED
    record.public_url = f"{settings.BACKEND_URL.rstrip('/')}/uploads/{record.storage_key}"
    
    db.commit()
    db.refresh(record)

    return created(
        data={
            "uploadToken": record.upload_token,
            "key": record.storage_key,
            "fileUrl": record.public_url,
            "updatedAt": datetime.utcnow().isoformat(),
        },
        message="Local upload stored successfully",
    )
