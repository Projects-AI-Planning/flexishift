from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user
from app.models.document import Document, DocType
from app.models.user import User
from app.services import documents as doc_svc

router = APIRouter(prefix="/users/me/documents", tags=["Documents"])


def _doc_dict(d: Document) -> dict:
    return {
        "documentId": d.id,
        "userId": d.user_id,
        "docType": d.doc_type.value,
        "fileUrl": d.file_url,
        "status": d.status.value,
        "rejectionReason": d.rejection_reason,
        "createdAt": d.created_at.isoformat() if d.created_at else None,
    }


@router.get("")
def list_my_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = db.query(Document).filter(Document.user_id == current_user.id).all()
    return ok(data={"items": [_doc_dict(d) for d in items], "total": len(items)}, message="Documents retrieved")


@router.get("/{doc_id}")
def get_my_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi import HTTPException
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return ok(data=_doc_dict(doc), message="Document retrieved")


@router.get("/upload-url")
def get_upload_url(
    doc_type: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    DocType(doc_type)
    result = doc_svc.get_upload_url(doc_type, current_user.id)
    return ok(data=result, message="Upload URL generated")


@router.post("", status_code=201)
def submit_document(
    doc_type: str = Query(...),
    file_url: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    DocType(doc_type)
    doc = doc_svc.upsert_document(db, current_user.id, doc_type, file_url)
    return created(data=_doc_dict(doc), message="Document submitted for review")
