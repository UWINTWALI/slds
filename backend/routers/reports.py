"""
Reports and notifications API.
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models.report import Notification, Report
from models.user import Role, User, UserRole
from schemas.report import (
    MinistryRecipient,
    NotificationOut,
    ReportDetail,
    ReportSubmit,
    ReportSubmitResponse,
    ReportSummary,
    SenderInfo,
    UnreadCount,
)
from services.auth_service import get_current_user
from services.report_service import _sender_info, submit_report

router = APIRouter(tags=["reports"])


async def _load_report(db: AsyncSession, report_id: uuid.UUID) -> Optional[Report]:
    result = await db.execute(
        select(Report)
        .options(selectinload(Report.sender).selectinload(User.user_roles).selectinload(UserRole.role))
        .where(Report.id == report_id)
    )
    return result.scalar_one_or_none()


@router.post("/reports", response_model=ReportSubmitResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    body: ReportSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        report, count = await submit_report(
            db,
            current_user,
            body.report_type,
            body.title,
            body.html_content,
            district=body.district,
            sector=body.sector,
            payload=body.payload,
            target_recipient_id=body.target_recipient_id,
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ReportSubmitResponse(
        id=str(report.id),
        reference_no=report.reference_no,
        message=f"Report submitted. {count} recipient(s) notified.",
        recipients_notified=count,
    )


@router.get("/reports/ministry-recipients", response_model=List[MinistryRecipient])
async def list_ministry_recipients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all active national_admin users so district officers can choose a recipient."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, UserRole.role_id == Role.id)
        .where(User.is_active.is_(True))
        .where(Role.name == "national_admin")
        .order_by(User.full_name)
    )
    users = result.scalars().unique().all()
    return [
        MinistryRecipient(
            id=str(u.id),
            full_name=u.full_name,
            email=u.email,
            title=u.title,
            ministry=u.ministry,
        )
        for u in users
    ]


@router.get("/reports", response_model=List[ReportSummary])
async def list_reports(
    box: str = Query("inbox", pattern="^(inbox|sent)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if box == "sent":
        q = select(Report).where(Report.sender_id == current_user.id)
    else:
        # Inbox: reports where user has a notification
        subq = select(Notification.report_id).where(
            Notification.user_id == current_user.id
        )
        q = select(Report).where(Report.id.in_(subq))

    q = q.options(
        selectinload(Report.sender).selectinload(User.user_roles).selectinload(UserRole.role)
    ).order_by(Report.created_at.desc())

    result = await db.execute(q)
    reports = result.scalars().unique().all()

    out: List[ReportSummary] = []
    for r in reports:
        out.append(
            ReportSummary(
                id=str(r.id),
                reference_no=r.reference_no,
                report_type=r.report_type,
                title=r.title,
                district=r.district,
                sector=r.sector,
                status=r.status,
                created_at=r.created_at,
                read_at=r.read_at,
                sender=SenderInfo(**_sender_info(r.sender)),
                is_inbox=box == "inbox",
            )
        )
    return out


@router.get("/reports/{report_id}", response_model=ReportDetail)
async def get_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        rid = uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Report not found")

    report = await _load_report(db, rid)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.sender_id != current_user.id:
        notif = await db.execute(
            select(Notification).where(
                Notification.report_id == rid,
                Notification.user_id == current_user.id,
            )
        )
        roles = {ur.role.name for ur in current_user.user_roles}
        if not notif.scalar_one_or_none() and "national_admin" not in roles and "analyst" not in roles:
            raise HTTPException(status_code=403, detail="Access denied")

    is_inbox = report.sender_id != current_user.id

    return ReportDetail(
        id=str(report.id),
        reference_no=report.reference_no,
        report_type=report.report_type,
        title=report.title,
        district=report.district,
        sector=report.sector,
        status=report.status,
        created_at=report.created_at,
        read_at=report.read_at,
        sender=SenderInfo(**_sender_info(report.sender)),
        is_inbox=is_inbox,
        html_content=report.html_content,
        payload=report.payload,
    )


@router.get("/reports/{report_id}/view", response_class=HTMLResponse)
async def view_report_html(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        rid = uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Report not found")

    report = await _load_report(db, rid)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.sender_id != current_user.id:
        notif = await db.execute(
            select(Notification).where(
                Notification.report_id == rid,
                Notification.user_id == current_user.id,
            )
        )
        roles = {ur.role.name for ur in current_user.user_roles}
        if not notif.scalar_one_or_none() and "national_admin" not in roles and "analyst" not in roles:
            raise HTTPException(status_code=403, detail="Access denied")

    return HTMLResponse(content=report.html_content)


@router.post("/reports/{report_id}/read", status_code=status.HTTP_200_OK)
async def mark_report_read(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        rid = uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Report not found")

    report = await _load_report(db, rid)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    notif_result = await db.execute(
        select(Notification).where(
            Notification.report_id == rid,
            Notification.user_id == current_user.id,
        )
    )
    notification = notif_result.scalar_one_or_none()
    if not notification and report.sender_id != current_user.id:
        roles = {ur.role.name for ur in current_user.user_roles}
        if "national_admin" not in roles:
            raise HTTPException(status_code=403, detail="Access denied")

    from datetime import datetime, timezone

    if notification:
        notification.is_read = True
    if report.sender_id != current_user.id and not report.read_at:
        report.read_at = datetime.now(timezone.utc)
        report.status = "read"

    return {"ok": True}


@router.get("/notifications", response_model=List[NotificationOut])
async def list_notifications(
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        select(Notification)
        .options(
            selectinload(Notification.sender).selectinload(User.user_roles).selectinload(UserRole.role),
            selectinload(Notification.report),
        )
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    if unread_only:
        q = q.where(Notification.is_read.is_(False))

    result = await db.execute(q)
    items = result.scalars().unique().all()

    return [
        NotificationOut(
            id=str(n.id),
            title=n.title,
            message=n.message,
            is_read=n.is_read,
            created_at=n.created_at,
            report_id=str(n.report_id),
            reference_no=n.report.reference_no,
            report_type=n.report.report_type,
            sender=SenderInfo(**_sender_info(n.sender)),
        )
        for n in items
    ]


@router.get("/notifications/unread-count", response_model=UnreadCount)
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
    )
    count = len(result.scalars().all())
    return UnreadCount(count=count)


@router.post("/notifications/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        nid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Notification not found")

    result = await db.execute(
        select(Notification).where(
            Notification.id == nid,
            Notification.user_id == current_user.id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    return {"ok": True}
