"""
Async SQLAlchemy engine and session factory for the SLDS application.
"""

import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

# Get the database URL from environment
raw_url = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://slds_user:slds_pass@localhost:5432/slds_db"
)

# Ensure the URL uses asyncpg - this is the critical fix
if raw_url.startswith("postgresql://") and "+asyncpg" not in raw_url:
    DATABASE_URL = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif "+asyncpg" not in raw_url:
    # If it's something else (like just postgresql://), force asyncpg
    DATABASE_URL = raw_url.replace("postgresql+", "postgresql+asyncpg://", 1) if "postgresql+" in raw_url else f"postgresql+asyncpg://{raw_url}"
else:
    DATABASE_URL = raw_url

# Create the async engine with explicit asyncpg driver
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    # No need for driver="asyncpg" here - the URL handles it
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise