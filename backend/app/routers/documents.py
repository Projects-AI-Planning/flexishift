from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.document import Document, DocType
from app.models.user import User
from app.schemas.documents import DocumentOut, DocumentListOut
from app.services import documents as doc_svc
from app.config import settings

router = APIRouter(prefix="/users/me/documents", tags=["Documents"])


@router.get("", response_model=DocumentListOut)
def list_my_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = db.query(Document).filter(Document.user_id == current_user.id).all()
    return {"items": items, "total": len(items)}


@router.get("/upload-url")
def get_upload_url(
    doc_type: str = Query(..., description="One of: DRIVING_LICENCE, VEHICLE_REG, VEHICLE_INSURANCE, COMPANY_REG, FLEET_INSURANCE"),
    current_user: User = Depends(get_current_user),
):
    DocType(doc_type)  # validates enum value
    return doc_svc.get_upload_url(doc_type, current_user.id)


@router.post("", response_model=DocumentOut, status_code=201)
def submit_document(
    doc_type: str = Query(...),
    file_url: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    DocType(doc_type)
    return doc_svc.upsert_document(db, current_user.id, doc_type, file_url)
