"""
Report submission, recipient routing, and notification delivery.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Set

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.report import Notification, Report
from models.user import AuditLog, Role, User, UserRole


def _reference_no() -> str:
    year = datetime.now(timezone.utc).year
    suffix = uuid.uuid4().hex[:6].upper()
    return f"SLDS-{year}-{suffix}"


def _role_names(user: User) -> Set[str]:
    return {ur.role.name for ur in user.user_roles}


def _sender_info(user: User) -> dict:
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "title": user.title,
        "district": user.district,
        "sector": user.sector,
        "roles": list(_role_names(user)),
    }


async def _users_with_role(
    db: AsyncSession, role_name: str, district: Optional[str] = None
) -> List[User]:
    q = (
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, UserRole.role_id == Role.id)
        .where(User.is_active.is_(True))
        .where(Role.name == role_name)
    )
    if district:
        q = q.where(User.district == district)
    result = await db.execute(q)
    return list(result.scalars().unique().all())


async def resolve_recipients(
    db: AsyncSession,
    report_type: str,
    sender: User,
    district: Optional[str],
    sector: Optional[str],
    payload: Optional[dict],
    target_recipient_id: Optional[str] = None,
) -> List[User]:
    """Route reports up the administrative chain."""
    recipients: List[User] = []
    sender_id = sender.id

    if report_type == "sector":
        if not district:
            return []
        recipients = await _users_with_role(db, "district_officer", district=district)

    elif report_type == "district":
        if target_recipient_id:
            # Target a specific national_admin chosen by the district officer
            import uuid as _uuid
            try:
                tid = _uuid.UUID(target_recipient_id)
            except ValueError:
                tid = None
            if tid:
                result = await db.execute(
                    select(User)
                    .options(selectinload(User.user_roles).selectinload(UserRole.role))
                    .where(User.id == tid, User.is_active.is_(True))
                )
                target = result.scalar_one_or_none()
                if target:
                    recipients = [target]
        if not recipients:
            recipients = await _users_with_role(db, "national_admin")

    elif report_type == "publication":
        seen: Set[uuid.UUID] = set()
        sector_names = (payload or {}).get("sector_names") or []
        districts_affected: Set[str] = set()

        for entry in (payload or {}).get("sectors") or []:
            d = entry.get("district") or entry.get("adm2_en")
            if d:
                districts_affected.add(d)

        for d in districts_affected:
            for u in await _users_with_role(db, "district_officer", district=d):
                if u.id not in seen and u.id != sender_id:
                    seen.add(u.id)
                    recipients.append(u)

        for name in sector_names:
            q = (
                select(User)
                .options(selectinload(User.user_roles).selectinload(UserRole.role))
                .join(UserRole, UserRole.user_id == User.id)
                .join(Role, UserRole.role_id == Role.id)
                .where(User.is_active.is_(True))
                .where(Role.name == "sector_officer")
                .where(User.sector == name)
            )
            result = await db.execute(q)
            for u in result.scalars().unique().all():
                if u.id not in seen and u.id != sender_id:
                    seen.add(u.id)
                    recipients.append(u)

    # Deduplicate and exclude sender
    unique: List[User] = []
    seen_ids: Set[uuid.UUID] = set()
    for u in recipients:
        if u.id != sender_id and u.id not in seen_ids:
            seen_ids.add(u.id)
            unique.append(u)
    return unique


def _notification_message(
    report_type: str, sender: User, title: str, district: Optional[str]
) -> str:
    org = sender.district or sender.ministry or "SLDS"
    if report_type == "sector":
        return (
            f"{sender.full_name} ({org}) submitted sector report \"{title}\" "
            f"for your review. You can view and download the document on the platform."
        )
    if report_type == "district":
        return (
            f"{sender.full_name} ({district or org}) submitted district report \"{title}\" "
            f"to the ministry. Open the report to view, read, or download the PDF."
        )
    return (
        f"{sender.full_name} published ministry notice \"{title}\". "
        f"View assigned infrastructure allocations on the platform."
    )


async def submit_report(
    db: AsyncSession,
    sender: User,
    report_type: str,
    title: str,
    html_content: str,
    district: Optional[str] = None,
    sector: Optional[str] = None,
    payload: Optional[dict] = None,
    target_recipient_id: Optional[str] = None,
) -> tuple[Report, int]:
    roles = _role_names(sender)

    if report_type == "sector" and "sector_officer" not in roles:
        raise PermissionError("Only sector officers can submit sector reports.")
    if report_type == "district" and "district_officer" not in roles:
        raise PermissionError("Only district officers can submit district reports.")
    if report_type == "publication" and "national_admin" not in roles:
        raise PermissionError("Only national administrators can publish ministry notices.")

    if report_type == "sector":
        if sender.district and district and sender.district != district:
            raise PermissionError("Cannot submit a report outside your district.")
        if sender.sector and sector and sender.sector != sector:
            raise PermissionError("Cannot submit a report outside your sector.")

    recipients = await resolve_recipients(
        db, report_type, sender, district, sector, payload,
        target_recipient_id=target_recipient_id,
    )
    if not recipients:
        raise ValueError("No recipients found for this report. Check that district officers are registered.")

    report = Report(
        reference_no=_reference_no(),
        report_type=report_type,
        title=title,
        district=district,
        sector=sector,
        sender_id=sender.id,
        html_content=html_content,
        payload=payload,
        status="submitted",
    )
    db.add(report)
    await db.flush()

    message = _notification_message(report_type, sender, title, district)
    for recipient in recipients:
        db.add(
            Notification(
                user_id=recipient.id,
                sender_id=sender.id,
                report_id=report.id,
                title="New report received",
                message=message,
                is_read=False,
            )
        )

    db.add(
        AuditLog(
            user_id=sender.id,
            action="report_submitted",
            resource="report",
            resource_id=str(report.id),
            details={
                "reference_no": report.reference_no,
                "report_type": report_type,
                "title": title,
                "recipients": len(recipients),
            },
        )
    )

    await db.flush()
    return report, len(recipients)
