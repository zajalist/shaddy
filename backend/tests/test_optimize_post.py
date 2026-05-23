import asyncio
import pytest

from tests._helpers import oversized_data_url, png_data_url


@pytest.fixture(autouse=True)
def _reset_registry():
    """Each test gets a clean serial slot."""
    from app.main import registry
    registry._slot = None
    yield
    registry._slot = None


@pytest.fixture(autouse=True)
def _force_cpu(monkeypatch):
    monkeypatch.setattr("torch.cuda.is_available", lambda: False)


async def test_post_optimize_accepts_valid_request(client):
    r = await client.post("/optimize", json={
        "template_id": "plasma",
        "image_base64": png_data_url(),
    })
    assert r.status_code == 202, r.text
    body = r.json()
    assert "job_id" in body
    assert body["ws_url"] == f"/optimize/stream/{body['job_id']}"
    assert body["resolved_device"] == "cpu"


async def test_post_optimize_rejects_unknown_template(client):
    r = await client.post("/optimize", json={
        "template_id": "nope",
        "image_base64": png_data_url(),
    })
    assert r.status_code == 422


async def test_post_optimize_rejects_oversized_image(client):
    r = await client.post("/optimize", json={
        "template_id": "plasma",
        "image_base64": oversized_data_url(),
    })
    assert r.status_code == 400
    assert "1MB" in r.json()["error"]


async def test_post_optimize_rejects_unparseable_image(client):
    r = await client.post("/optimize", json={
        "template_id": "plasma",
        "image_base64": "data:image/png;base64,Tm90QW5JbWFnZQ==",
    })
    assert r.status_code == 400
    assert "unsupported" in r.json()["error"]


async def test_post_optimize_rejects_cuda_when_unavailable(client):
    r = await client.post("/optimize", json={
        "template_id": "plasma",
        "image_base64": png_data_url(),
        "device": "cuda",
    })
    assert r.status_code == 400
    assert "cuda" in r.json()["error"]


async def test_post_optimize_returns_503_when_slot_busy(client):
    body = {"template_id": "plasma", "image_base64": png_data_url()}
    r1 = await client.post("/optimize", json=body)
    assert r1.status_code == 202

    r2 = await client.post("/optimize", json=body)
    assert r2.status_code == 503
    assert "another job" in r2.json()["error"]


async def test_post_optimize_ttl_frees_slot_after_no_ws(client, monkeypatch):
    # Patch the TTL to a tiny value so the test is fast.
    import app.optimize as opt
    monkeypatch.setattr(opt, "UNCLAIMED_TTL_SEC", 0.1)

    body = {"template_id": "plasma", "image_base64": png_data_url()}
    r1 = await client.post("/optimize", json=body)
    assert r1.status_code == 202

    await asyncio.sleep(0.3)  # let the TTL fire

    r2 = await client.post("/optimize", json=body)
    assert r2.status_code == 202, "TTL should have freed the slot"
