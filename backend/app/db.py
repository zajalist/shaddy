from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import get_settings


class Base(DeclarativeBase):
    pass


_settings = get_settings()
_url = _settings.database_url or "postgresql+asyncpg://shaddy:shaddy@postgres:5432/shaddy"

# NullPool: open a fresh connection per use. Avoids cross-event-loop pool reuse
# (which breaks under pytest-asyncio's per-test loops) and is fine at our scale.
engine = create_async_engine(_url, future=True, poolclass=NullPool)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
