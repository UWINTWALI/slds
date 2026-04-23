"""
Authentication service: password hashing, JWT creation/validation,
current-user dependency, and role-based access control helpers.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import bcrypt as _bcrypt
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models.user import Role, User, UserRole

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SECRET_KEY: str = os.getenv(
    "SECRET_KEY", "slds-secret-key-change-in-production"
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode(), hashed.encode())


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a signed JWT containing *data* plus an expiry claim."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> str:
    """
    Decode *token* and return the ``sub`` claim (user email).

    Raises ``HTTPException(401)`` if the token is invalid or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub: Optional[str] = payload.get("sub")
        if sub is None:
            raise credentials_exception
        return sub
    except JWTError:
        raise credentials_exception


# ---------------------------------------------------------------------------
# DB-backed authentication helpers
# ---------------------------------------------------------------------------

async def _get_user_with_roles(db: AsyncSession, email: str) -> Optional[User]:
    """Return the User with eagerly loaded roles, or None."""
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.user_roles).selectinload(UserRole.role)
        )
        .where(User.email == email)
    )
    return result.scalar_one_or_none()


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> Optional[User]:
    """
    Return the active User if credentials are valid, otherwise None.
    """
    user = await _get_user_with_roles(db, email)
    if user is None:
        return None
    if not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

_bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency: decode the Bearer token and return the active User.

    Raises ``HTTPException(401)`` if the token is invalid, or the user does
    not exist / is inactive.
    """
    token = credentials.credentials
    email = decode_token(token)

    user = await _get_user_with_roles(db, email)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_role(*roles: str):
    """
    Return a FastAPI dependency that asserts the current user holds at least
    one of the named roles.

    Usage::

        @router.get("/admin", dependencies=[Depends(require_role("national_admin"))])
        async def admin_endpoint(): ...
    """

    async def _check(
        current_user: User = Depends(get_current_user),
    ) -> User:
        user_role_names = {ur.role.name for ur in current_user.user_roles}
        if not user_role_names.intersection(set(roles)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. Required role(s): {', '.join(roles)}. "
                    f"Your role(s): {', '.join(user_role_names) or 'none'}."
                ),
            )
        return current_user

    return _check
