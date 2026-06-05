import os
import time
import uuid
from types import SimpleNamespace

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from jose import jwt

TEST_DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql+asyncpg://shaddy:shaddy@postgres:5432/shaddy"
)

TEST_SUPABASE_URL = "https://proj.supabase.co"
TEST_JWT_SECRET = "testsecret"


@pytest_asyncio.fixture
async def client():
    # Imported lazily so test collection does not hard-fail before app.main exists.
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def _fresh_schema():
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    import app.models  # noqa: F401 — registers tables on Base.metadata
    from app.db import Base

    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    return engine, async_sessionmaker(engine, expire_on_commit=False)


@pytest_asyncio.fixture
async def db_session():
    engine, Session = await _fresh_schema()
    async with Session() as session:
        yield session
    await engine.dispose()


@pytest.fixture
def make_token():
    """Mint an HS256 JWT matching the test settings (issuer/secret/audience)."""

    def _make(sub=None, *, aud="authenticated", exp_delta=3600, secret=TEST_JWT_SECRET, **extra):
        sub = sub or str(uuid.uuid4())
        now = int(time.time())
        claims = {
            "sub": sub,
            "aud": aud,
            "iss": f"{TEST_SUPABASE_URL}/auth/v1",
            "exp": now + exp_delta,
            "iat": now,
            **extra,
        }
        return jwt.encode(claims, secret, algorithm="HS256"), sub

    return _make


@pytest_asyncio.fixture
async def api():
    """An AsyncClient wired to the app with the DB + settings overridden for tests."""
    from app.config import Settings, get_settings
    from app.db import get_session
    from app.main import app

    engine, Session = await _fresh_schema()
    test_settings = Settings(
        supabase_url=TEST_SUPABASE_URL,
        supabase_jwt_alg="HS256",
        supabase_jwt_secret=TEST_JWT_SECRET,
        public_base_url="https://api.test",
        cors_origins="",
    )

    async def _override_session():
        async with Session() as s:
            yield s

    app.dependency_overrides[get_session] = _override_session
    app.dependency_overrides[get_settings] = lambda: test_settings

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield SimpleNamespace(client=client, Session=Session, settings=test_settings)

    app.dependency_overrides.clear()
    await engine.dispose()


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def simple_recipe(mode="2d"):
    return {
        "cards": [
            {"kind": "typed", "id": "c1", "type": "plasma", "enabled": True, "params": {}}
        ],
        "canvasAspect": "square",
        "mode": mode,
    }
