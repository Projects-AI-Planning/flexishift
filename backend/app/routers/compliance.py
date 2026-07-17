from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, Role
from app.models.compliance import ComplianceRecord
from app.schemas.compliance import LoadCodeRequest, Step1Request, Step2Request, DisputeRequest, ComplianceOut
from app.services import compliance as comp_svc

router = APIRouter(prefix="/jobs", tags=["Compliance"])


@router.get("/{job_id}/compliance", response_model=ComplianceOut)
def get_compliance(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(ComplianceRecord).filter(ComplianceRecord.job_id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Compliance record not found")
    return record


@router.post("/{job_id}/compliance/verify-load-code", response_model=ComplianceOut)
def verify_load_code(
    job_id: str,
    body: LoadCodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    return comp_svc.verify_load_code(db, job_id, current_user.id, body.load_code)


@router.post("/{job_id}/compliance/step1", response_model=ComplianceOut)
def complete_step1(
    job_id: str,
    body: Step1Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    return comp_svc.complete_step1(db, job_id, current_user.id, body.model_dump())


@router.post("/{job_id}/compliance/step2", response_model=ComplianceOut)
def complete_step2(
    job_id: str,
    body: Step2Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    return comp_svc.complete_step2(db, job_id, current_user.id, body.model_dump())


@router.post("/{job_id}/compliance/approve", response_model=ComplianceOut)
async def approve_delivery(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.ADMIN)),
):
    return await comp_svc.approve_delivery(db, job_id, current_user.id)


@router.post("/{job_id}/compliance/dispute", response_model=ComplianceOut)
def raise_dispute(
    job_id: str,
    body: DisputeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM, Role.ADMIN)),
):
    return comp_svc.raise_dispute(db, job_id, current_user.id, body.dispute_reason)
