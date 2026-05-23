import pytest

from app.jobs import Job, JobRegistry, SlotBusy


def _stub_job(job_id: str = "j1") -> Job:
    return Job(
        job_id=job_id,
        template_id="plasma",
        image_bytes=b"\x00",
        resolved_device="cpu",
        max_steps=500,
        wall_clock_cap_sec=30,
        created_at=0.0,
    )


async def test_acquire_fills_slot_and_get_returns_it():
    r = JobRegistry()
    job = _stub_job()
    await r.acquire(job)
    assert r.current() is job
    assert r.get("j1") is job


async def test_acquire_when_busy_raises_slot_busy():
    r = JobRegistry()
    await r.acquire(_stub_job("j1"))
    with pytest.raises(SlotBusy):
        await r.acquire(_stub_job("j2"))


async def test_release_empties_slot_and_allows_reacquire():
    r = JobRegistry()
    await r.acquire(_stub_job("j1"))
    await r.release()
    assert r.current() is None
    assert r.get("j1") is None
    await r.acquire(_stub_job("j2"))
    assert r.current().job_id == "j2"


async def test_release_when_empty_is_idempotent():
    r = JobRegistry()
    await r.release()
    assert r.current() is None


async def test_get_unknown_id_returns_none():
    r = JobRegistry()
    assert r.get("anything") is None
