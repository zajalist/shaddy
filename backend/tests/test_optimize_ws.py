import json

import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests._helpers import png_data_url

# _reset_registry and _force_cpu are autouse fixtures from conftest.py.


def test_ws_streams_progress_then_done(monkeypatch):
    """End-to-end: POST then WS receives at least one ProgressFrame followed by
    exactly one DoneFrame. Cap CPU steps to 3 for test speed.
    """
    from optim import runner

    monkeypatch.setattr(runner, "CPU_MAX_STEPS", 3)

    sync_client = TestClient(app)
    r = sync_client.post("/optimize", json={
        "template_id": "plasma",
        "image_base64": png_data_url(),
    })
    assert r.status_code == 202
    job_id = r.json()["job_id"]

    progress_frames: list = []
    done_frame = None
    with sync_client.websocket_connect(f"/optimize/stream/{job_id}") as ws:
        while True:
            try:
                msg = ws.receive_text()
            except Exception:
                break
            payload = json.loads(msg)
            if payload["type"] == "progress":
                progress_frames.append(payload)
            elif payload["type"] == "done":
                done_frame = payload
                break

    assert len(progress_frames) >= 1, "expected at least one progress frame"
    assert done_frame is not None, "expected a done frame"
    assert "/*PARAM:" not in done_frame["glsl"], "literals must be filled in"
    assert "freq_x" in done_frame["final_params"]


def test_ws_unknown_job_id_is_rejected():
    sync_client = TestClient(app)
    from starlette.websockets import WebSocketDisconnect
    with pytest.raises(WebSocketDisconnect):
        with sync_client.websocket_connect("/optimize/stream/does-not-exist") as ws:
            ws.receive_text()


def test_ws_releases_slot_on_close(monkeypatch):
    """After the WS closes, another POST should succeed."""
    from optim import runner

    monkeypatch.setattr(runner, "CPU_MAX_STEPS", 3)

    sync_client = TestClient(app)
    body = {"template_id": "plasma", "image_base64": png_data_url()}
    r1 = sync_client.post("/optimize", json=body)
    assert r1.status_code == 202
    job_id = r1.json()["job_id"]

    with sync_client.websocket_connect(f"/optimize/stream/{job_id}") as ws:
        # Drain all frames.
        try:
            while True:
                ws.receive_text()
        except Exception:
            pass

    r2 = sync_client.post("/optimize", json=body)
    assert r2.status_code == 202, "slot should have been freed when WS closed"
