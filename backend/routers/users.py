"""
Admin-only user management router.

All endpoints require the ``national_admin`` role.
"""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models.user import Role, User, UserRole
from schemas.auth import (
    MessageResponse,
    RoleAssign,
    UserCreate,
    UserResponse,
    UserUpdate,
    EmailChangeRequestResponse,
)
from services.auth_service import get_current_user, hash_password, require_role
from models.user import EmailChangeRequest, AuditLog
from sqlalchemy import select
from datetime import datetime

router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(require_role("national_admin"))],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        title=user.title,
        district=user.district,
        sector=user.sector,
        ministry=user.ministry,
        roles=[ur.role.name for ur in user.user_roles],
        is_active=user.is_active,
    )


async def _get_user_or_404(db: AsyncSession, user_id: str | uuid.UUID) -> User:
    if isinstance(user_id, str):
        try:
            uid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid user_id format",
            )
    else:
        uid = user_id

    result = await db.execute(
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .where(User.id == uid)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


async def _get_role_or_404(db: AsyncSession, role_name: str) -> Role:
    result = await db.execute(select(Role).where(Role.name == role_name))
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role '{role_name}' not found",
        )
    return role


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[UserResponse], status_code=status.HTTP_200_OK)
async def list_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=500),
    search: str | None = Query(default=None),
    role: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> List[UserResponse]:
    """Return a paginated list of users with optional search and role filters.

    - `search` will match against full name and email (case-insensitive, partial).
    - `role` will restrict to users who hold the named role.
    """

    stmt = (
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .order_by(User.created_at.desc())
    )

    if search:
        term = f"%{search}%"
        stmt = stmt.where(or_(User.full_name.ilike(term), User.email.ilike(term)))

    if role:
        # join through user_roles -> role to filter by role name
        stmt = stmt.join(User.user_roles).join(Role).where(Role.name == role).distinct()

    stmt = stmt.offset(skip).limit(limit)

    result = await db.execute(stmt)
    users = result.scalars().all()
    return [_user_to_response(u) for u in users]


@router.get(
    "/email-change-requests",
    response_model=List[EmailChangeRequestResponse],
    status_code=status.HTTP_200_OK,
)
async def list_email_change_requests(db: AsyncSession = Depends(get_db)) -> List[EmailChangeRequestResponse]:
    """Return all email change requests with user details."""
    result = await db.execute(
        select(EmailChangeRequest)
        .options(selectinload(EmailChangeRequest.user))
        .order_by(EmailChangeRequest.requested_at.desc())
    )
    reqs = result.scalars().all()
    return [
        {
            "id": str(req.id),
            "user_id": str(req.user_id),
            "user_full_name": req.user.full_name if req.user else None,
            "current_email": req.user.email if req.user else None,
            "new_email": req.new_email,
            "status": req.status,
            "requested_by": str(req.requested_by) if req.requested_by else None,
            "requested_at": req.requested_at.isoformat() if req.requested_at else None,
            "processed_by": str(req.processed_by) if req.processed_by else None,
            "processed_at": req.processed_at.isoformat() if req.processed_at else None,
        }
        for req in reqs
    ]


@router.post(
    "/email-change-requests/{req_id}/approve",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def approve_email_change_request(
    req_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Approve a pending email change request and update the user's email."""
    try:
        rid = uuid.UUID(req_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid request id")

    result = await db.execute(select(EmailChangeRequest).where(EmailChangeRequest.id == rid))
    req = result.scalar_one_or_none()
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if req.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request is not pending")

    # Check duplicate email
    existing = await db.execute(select(User).where(User.email == req.new_email))
    existing_user = existing.scalar_one_or_none()
    if existing_user is not None and existing_user.id != req.user_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Another account already uses this email")

    user = await _get_user_or_404(db, str(req.user_id))
    user.email = req.new_email
    user.is_active = True
    req.status = "approved"
    req.processed_by = current_user.id
    req.processed_at = datetime.now()
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="email_change_approved",
            resource="email_change_requests",
            resource_id=str(req.id),
            details={"approved_for_user": str(user.id), "new_email": req.new_email},
        )
    )
    await db.flush()
    return MessageResponse(message="Email change approved and user updated")


@router.post(
    "/email-change-requests/{req_id}/deny",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def deny_email_change_request(
    req_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Deny a pending email change request."""
    try:
        rid = uuid.UUID(req_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid request id")

    result = await db.execute(select(EmailChangeRequest).where(EmailChangeRequest.id == rid))
    req = result.scalar_one_or_none()
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if req.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request is not pending")

    user = await _get_user_or_404(db, str(req.user_id))
    req.status = "denied"
    req.processed_by = current_user.id
    req.processed_at = datetime.now()
    user.is_active = True
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="email_change_denied",
            resource="email_change_requests",
            resource_id=str(req.id),
            details={"denied_for_user": str(user.id), "new_email": req.new_email},
        )
    )
    await db.flush()
    return MessageResponse(message="Email change request denied")
@router.get(
    "/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK
)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Return a single user by ID."""
    user = await _get_user_or_404(db, user_id)
    return _user_to_response(user)


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Create a new user and optionally assign roles."""
    # Check for duplicate email
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    new_user = User(
        id=uuid.uuid4(),
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        title=body.title,
        district=body.district,
        sector=body.sector,
        ministry=body.ministry,
    )
    db.add(new_user)
    await db.flush()  # obtain new_user.id before creating UserRole rows

    for role_name in body.roles:
        role = await _get_role_or_404(db, role_name)
        db.add(
            UserRole(
                user_id=new_user.id,
                role_id=role.id,
                assigned_by=current_user.id,
            )
        )

    await db.flush()

    # Reload with roles for the response
    return _user_to_response(await _get_user_or_404(db, str(new_user.id)))


@router.patch(
    "/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK
)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update mutable fields of an existing user."""
    user = await _get_user_or_404(db, user_id)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.flush()
    return _user_to_response(user)


@router.delete(
    "/{user_id}", response_model=MessageResponse, status_code=status.HTTP_200_OK
)
async def delete_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Delete a user from the database. Cannot delete yourself."""
    if str(current_user.id) == str(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    user = await _get_user_or_404(db, user_id)
    await db.delete(user)
    await db.flush()
    return MessageResponse(message=f"User '{user.email}' has been deleted")


@router.post(
    "/{user_id}/roles",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
)
async def assign_role(
    user_id: uuid.UUID,
    body: RoleAssign,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Assign a role to a user. No-op if the user already holds the role."""
    user = await _get_user_or_404(db, user_id)
    role = await _get_role_or_404(db, body.role_name)

    existing_role_ids = {ur.role_id for ur in user.user_roles}
    if role.id not in existing_role_ids:
        db.add(
            UserRole(
                user_id=user.id,
                role_id=role.id,
                assigned_by=current_user.id,
            )
        )
        await db.flush()

    return _user_to_response(await _get_user_or_404(db, user_id))


@router.delete(
    "/{user_id}/roles/{role_name}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
)
async def revoke_role(
    user_id: uuid.UUID,
    role_name: str,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Remove a role from a user."""
    user = await _get_user_or_404(db, user_id)
    role = await _get_role_or_404(db, role_name)

    user_role = next(
        (ur for ur in user.user_roles if ur.role_id == role.id), None
    )
    if user_role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User does not have role '{role_name}'",
        )

    await db.delete(user_role)
    await db.flush()

    return _user_to_response(await _get_user_or_404(db, user_id))


