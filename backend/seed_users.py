"""
Standalone seed script — NOT imported by the application.

Creates six demo users that match the frontend DEMO_USERS array.

Usage:
    python seed_users.py

The DATABASE_URL environment variable is respected; if absent the default
development URL is used.
"""

import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

import bcrypt as _bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload

# ---------------------------------------------------------------------------
# Inline engine setup (avoids circular imports when running standalone)
# ---------------------------------------------------------------------------

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://slds_user:slds_pass@localhost:5432/slds_db",
)

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()


# ---------------------------------------------------------------------------
# Demo user definitions
# ---------------------------------------------------------------------------

DEMO_USERS = [
    {
        "username": "admin",
        "email": "admin@gmail.com",
        "password": "admin",
        "full_name": "System Administrator",
        "title": "National Administrator",
        "role": "national_admin",
        "district": None,
        "sector": None,
    },
    {
        "username": "gasabo",
        "email": "gasabo@slds.rw",
        "password": "district",
        "full_name": "Gasabo District Officer",
        "title": "District Planning Officer",
        "role": "district_officer",
        "district": "Gasabo",
        "sector": None,
    },
    {
        "username": "musanze",
        "email": "musanze@slds.rw",
        "password": "district",
        "full_name": "Musanze District Officer",
        "title": "District Planning Officer",
        "role": "district_officer",
        "district": "Musanze",
        "sector": None,
    },
    {
        "username": "rutunga",
        "email": "rutunga@slds.rw",
        "password": "sector",
        "full_name": "Rutunga Sector Officer",
        "title": "Sector Monitoring Officer",
        "role": "sector_officer",
        "district": "Gasabo",
        "sector": "Rutunga",
    },
    {
        "username": "remera",
        "email": "remera@slds.rw",
        "password": "sector",
        "full_name": "Remera Sector Officer",
        "title": "Sector Monitoring Officer",
        "role": "sector_officer",
        "district": "Gasabo",
        "sector": "Remera",
    },
    {
        "username": "analyst",
        "email": "analyst@slds.rw",
        "password": "analyst",
        "full_name": "Data Analyst",
        "title": "Senior Data Analyst",
        "role": "analyst",
        "district": None,
        "sector": None,
    },
]


# ---------------------------------------------------------------------------
# Seeding logic
# ---------------------------------------------------------------------------

async def seed() -> None:
    # Import models here to avoid issues if the script is run before the app
    # is properly set up; we need the ORM classes to be registered on Base.
    from models.user import Role, User, UserRole  # noqa: PLC0415

    ok_count = 0
    fail_count = 0

    async with AsyncSessionLocal() as session:
        for demo in DEMO_USERS:
            try:
                # Check for existing user
                result = await session.execute(
                    select(User).where(User.email == demo["email"])
                )
                if result.scalar_one_or_none() is not None:
                    print(f"  SKIP  {demo['email']} — already exists")
                    ok_count += 1
                    continue

                # Resolve role
                role_result = await session.execute(
                    select(Role).where(Role.name == demo["role"])
                )
                role = role_result.scalar_one_or_none()
                if role is None:
                    print(
                        f"  FAIL  {demo['email']} — role '{demo['role']}' not found in DB. "
                        "Run schema.sql first."
                    )
                    fail_count += 1
                    continue

                # Create user
                new_user = User(
                    id=uuid.uuid4(),
                    email=demo["email"],
                    password_hash=hash_password(demo["password"]),
                    full_name=demo["full_name"],
                    title=demo.get("title"),
                    district=demo.get("district"),
                    sector=demo.get("sector"),
                    is_active=True,
                    is_superuser=(demo["role"] == "national_admin"),
                )
                session.add(new_user)
                await session.flush()

                # Assign role
                session.add(
                    UserRole(
                        user_id=new_user.id,
                        role_id=role.id,
                        assigned_by=None,
                    )
                )
                await session.flush()

                print(f"  OK    {demo['email']} ({demo['role']})")
                ok_count += 1

            except Exception as exc:  # noqa: BLE001
                await session.rollback()
                print(f"  FAIL  {demo['email']} — {exc}")
                fail_count += 1
                continue

        await session.commit()

    print(f"\nSeed complete: {ok_count} succeeded, {fail_count} failed.")
    if fail_count:
        sys.exit(1)


if __name__ == "__main__":
    print("Seeding demo users …\n")
    asyncio.run(seed())
