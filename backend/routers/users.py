"""
Admin-only user management router.

All endpoints require the ``national_admin`` role.
"""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
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
)
from services.auth_service import get_current_user, hash_password, require_role

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
        roles=[ur.role.name for ur in user.user_roles],
        is_active=user.is_active,
    )


async def _get_user_or_404(db: AsyncSession, user_id: str) -> User:
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid user_id format",
        )
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
    db: AsyncSession = Depends(get_db),
) -> List[UserResponse]:
    """Return a paginated list of all users with their role names."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    users = result.scalars().all()
    return [_user_to_response(u) for u in users]


@router.get(
    "/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK
)
async def get_user(
    user_id: str,
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
    user_id: str,
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
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Soft-delete a user (sets is_active=False). Cannot delete yourself."""
    if str(current_user.id) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    user = await _get_user_or_404(db, user_id)
    user.is_active = False
    await db.flush()
    return MessageResponse(message=f"User '{user.email}' has been deactivated")


@router.post(
    "/{user_id}/roles",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
)
async def assign_role(
    user_id: str,
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
    user_id: str,
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
