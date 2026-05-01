from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.response import ok
from app.database import get_db
from app.dependencies import require_role
from app.models.support_ticket import SupportTicket, SupportTicketPriority, SupportTicketStatus
from app.models.user import Role, User
from app.schemas.support_tickets import SupportTicketCreateRequest, SupportTicketUpdateRequest

router = APIRouter(prefix="/admin/support", tags=["Support"])
AdminDep = require_role(Role.ADMIN)


def _ticket_dict(ticket: SupportTicket) -> dict:
    return {
        "ticketId": ticket.id,
        "userId": ticket.user_id,
        "requesterName": ticket.requester_name,
        "requesterEmail": ticket.requester_email,
        "category": ticket.category,
        "priority": ticket.priority.value if hasattr(ticket.priority, "value") else str(ticket.priority),
        "subject": ticket.subject,
        "description": ticket.description,
        "status": ticket.status.value if hasattr(ticket.status, "value") else str(ticket.status),
        "resolutionNotes": ticket.resolution_notes,
        "createdAt": ticket.created_at.isoformat() if ticket.created_at else None,
        "updatedAt": ticket.updated_at.isoformat() if ticket.updated_at else None,
        "resolvedAt": ticket.resolved_at.isoformat() if ticket.resolved_at else None,
    }


def _apply_status_filters(q, status: str | None):
    if not status:
        return q
    try:
        return q.filter(SupportTicket.status == SupportTicketStatus(status.upper()))
    except ValueError:
        return q.filter(False)


@router.post("", status_code=201)
def create_support_ticket(
    body: SupportTicketCreateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(AdminDep),
):
    try:
        priority = SupportTicketPriority(body.priority.upper())
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid support ticket priority")

    ticket = SupportTicket(
        user_id=body.user_id,
        requester_name=body.requester_name,
        requester_email=body.requester_email,
        category=body.category,
        priority=priority,
        subject=body.subject,
        description=body.description,
        status=SupportTicketStatus.OPEN,
        assigned_admin_id=admin.id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ok(data=_ticket_dict(ticket), message="Support ticket created successfully.")


@router.get("/active")
def list_active_support_tickets(
    search: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    q = db.query(SupportTicket).filter(SupportTicket.status.in_([SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS]))
    if search:
        term = f"%{search}%"
        q = q.filter(
            SupportTicket.subject.ilike(term)
            | SupportTicket.description.ilike(term)
            | SupportTicket.requester_name.ilike(term)
            | SupportTicket.requester_email.ilike(term)
            | SupportTicket.category.ilike(term)
        )
    total = q.count()
    items = q.order_by(SupportTicket.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return ok(
        data={
            "items": [_ticket_dict(ticket) for ticket in items],
            "total": total,
            "page": page,
            "limit": limit,
        },
        message="Active support tickets fetched successfully.",
    )


@router.get("/resolved")
def list_resolved_support_tickets(
    search: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    q = db.query(SupportTicket).filter(SupportTicket.status.in_([SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED]))
    if search:
        term = f"%{search}%"
        q = q.filter(
            SupportTicket.subject.ilike(term)
            | SupportTicket.description.ilike(term)
            | SupportTicket.requester_name.ilike(term)
            | SupportTicket.requester_email.ilike(term)
            | SupportTicket.category.ilike(term)
        )
    total = q.count()
    items = q.order_by(SupportTicket.resolved_at.desc().nullslast(), SupportTicket.updated_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return ok(
        data={
            "items": [_ticket_dict(ticket) for ticket in items],
            "total": total,
            "page": page,
            "limit": limit,
        },
        message="Resolved support tickets fetched successfully.",
    )


@router.get("/stats")
def support_stats(
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    total = db.query(SupportTicket).count()
    open_count = db.query(SupportTicket).filter(SupportTicket.status == SupportTicketStatus.OPEN).count()
    active_count = db.query(SupportTicket).filter(SupportTicket.status == SupportTicketStatus.IN_PROGRESS).count()
    resolved_count = db.query(SupportTicket).filter(SupportTicket.status == SupportTicketStatus.RESOLVED).count()
    closed_count = db.query(SupportTicket).filter(SupportTicket.status == SupportTicketStatus.CLOSED).count()
    return ok(
        data={
            "totalTickets": total,
            "openTickets": open_count,
            "inProgressTickets": active_count,
            "resolvedTickets": resolved_count,
            "closedTickets": closed_count,
        },
        message="Support ticket stats fetched successfully.",
    )


@router.get("/{ticket_id}")
def get_support_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found")
    return ok(data=_ticket_dict(ticket), message="Support ticket fetched successfully.")


@router.put("/{ticket_id}/status")
def update_support_ticket_status(
    ticket_id: str,
    body: SupportTicketUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(AdminDep),
):
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found")

    try:
        ticket.status = SupportTicketStatus(body.status.upper())
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid support ticket status")

    ticket.resolution_notes = body.resolution_notes or ticket.resolution_notes
    ticket.assigned_admin_id = admin.id
    if ticket.status in {SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED}:
        ticket.resolved_at = datetime.now(timezone.utc)
    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)
    return ok(data=_ticket_dict(ticket), message="Support ticket status updated successfully.")
