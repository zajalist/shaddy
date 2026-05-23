import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import DoneFrame
from tests._helpers import png_data_url

# _reset_registry and _force_cpu are autouse fixtures from conftest.py.

_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"


def test_ws_sends_one_done_frame_with_template_glsl():
    """End-to-end stub: POST then WS receives a single DoneFrame and closes.

    Per spec §7: the returned GLSL must match the template file byte-for-byte.
    """
    sync_client = TestClient(app)
    r = sync_client.post("/optimize", json={
        "template_id": "plasma",
        "image_base64": png_data_url(),
    })
    assert r.status_code == 202
    job_id = r.json()["job_id"]

    with sync_client.websocket_connect(f"/optimize/stream/{job_id}") as ws:
        msg = ws.receive_text()

    payload = json.loads(msg)
    frame = DoneFrame.model_validate(payload)
    assert frame.type == "done"
    assert frame.loss == 0.0

    expected_glsl = (_TEMPLATES_DIR / "plasma.glsl").read_text(encoding="utf-8")
    assert frame.glsl == expected_glsl, "DoneFrame.glsl must match plasma.glsl byte-for-byte"
    assert "freq_x" in frame.final_params


def test_ws_unknown_job_id_is_rejected():
    sync_client = TestClient(app)
    from starlette.websockets import WebSocketDisconnect
    with pytest.raises(WebSocketDisconnect):
        with sync_client.websocket_connect("/optimize/stream/does-not-exist") as ws:
            ws.receive_text()


def test_ws_releases_slot_on_close():
    """After the WS closes, another POST should succeed."""
    sync_client = TestClient(app)
    body = {"template_id": "plasma", "image_base64": png_data_url()}
    r1 = sync_client.post("/optimize", json=body)
    assert r1.status_code == 202
    job_id = r1.json()["job_id"]

    with sync_client.websocket_connect(f"/optimize/stream/{job_id}") as ws:
        ws.receive_text()
    # WS context manager closes here.

    r2 = sync_client.post("/optimize", json=body)
    assert r2.status_code == 202, "slot should have been freed when WS closed"
