import asyncio

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app, registry


async def _drain_registry() -> None:
    """Cancel any pending gc_task and clear the serial slot."""
    job = registry.current()
    if job is not None and job.gc_task is not None and not job.gc_task.done():
        job.gc_task.cancel()
        try:
            await job.gc_task
        except asyncio.CancelledError:
            pass
    await registry.release()


@pytest_asyncio.fixture(autouse=True)
async def _reset_registry():
    """Each test gets a clean serial slot. Async so we can cancel the gc_task."""
    await _drain_registry()
    yield
    await _drain_registry()


@pytest.fixture(autouse=True)
def _force_cpu(monkeypatch):
    """Every test pretends there's no GPU so device.resolve() is deterministic."""
    monkeypatch.setattr("torch.cuda.is_available", lambda: False)


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
