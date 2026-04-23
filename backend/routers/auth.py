"""
Authentication router: login, logout, current-user info, and password change.
"""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import Role, Session as DBSession, User, UserRole
from schemas.auth import (
    LoginRequest,
    MessageResponse,
    PasswordChange,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from services.auth_service import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_user,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


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


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate with email + password and receive a JWT."""
    user = await authenticate_user(db, body.email, body.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=expires_delta
    )

    # Persist the session so we can support revocation
    session_record = DBSession(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=_hash_token(access_token),
        expires_at=datetime.now(timezone.utc) + expires_delta,
        ip_address=_client_ip(request),
    )
    db.add(session_record)
    await db.flush()

    return TokenResponse(
        access_token=access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=_user_to_response(user),
    )


@router.post("/logout", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Revoke the current session token."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.removeprefix("Bearer ").strip()

    if token:
        token_hash = _hash_token(token)
        result = await db.execute(
            select(DBSession).where(
                DBSession.token_hash == token_hash,
                DBSession.user_id == current_user.id,
                DBSession.revoked_at.is_(None),
            )
        )
        session = result.scalar_one_or_none()
        if session:
            session.revoked_at = datetime.now(timezone.utc)
            await db.flush()

    return MessageResponse(message="Successfully logged out")


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Return the profile of the authenticated user."""
    return _user_to_response(current_user)


@router.post(
    "/me/change-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def change_password(
    body: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Change the password of the currently authenticated user."""
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = hash_password(body.new_password)
    await db.flush()

    return MessageResponse(message="Password updated successfully")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Self-registration for non-admin users."""
    # Reject duplicate emails
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # Resolve role
    role_result = await db.execute(select(Role).where(Role.name == body.role))
    role = role_result.scalar_one_or_none()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{body.role}' not found.",
        )

    # Create user
    new_user = User(
        id=uuid.uuid4(),
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        district=body.district or None,
        sector=body.sector or None,
        is_active=True,
        is_superuser=False,
    )
    db.add(new_user)
    await db.flush()

    # Assign role
    db.add(UserRole(user_id=new_user.id, role_id=role.id, assigned_by=None))
    await db.flush()

    # Reload with roles for the response
    from sqlalchemy.orm import selectinload  # noqa: PLC0415
    result = await db.execute(
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .where(User.id == new_user.id)
    )
    created = result.scalar_one()
    return _user_to_response(created)
