import pytest
from pydantic import ValidationError

from app.schemas import (
    DoneFrame,
    ErrorFrame,
    OptimizeAccepted,
    OptimizeError,
    OptimizeRequest,
    ProgressFrame,
)


def test_optimize_request_defaults():
    r = OptimizeRequest(template_id="plasma", image_base64="x")
    assert r.device == "auto"
    assert r.max_steps == 500
    assert r.wall_clock_cap_sec == 30


def test_optimize_request_rejects_unknown_template_id():
    with pytest.raises(ValidationError):
        OptimizeRequest(template_id="nope", image_base64="x")


def test_optimize_request_rejects_unknown_device():
    with pytest.raises(ValidationError):
        OptimizeRequest(template_id="plasma", image_base64="x", device="tpu")


def test_optimize_request_rejects_oversized_max_steps():
    with pytest.raises(ValidationError):
        OptimizeRequest(template_id="plasma", image_base64="x", max_steps=501)


def test_optimize_accepted_minimal():
    a = OptimizeAccepted(job_id="abc", ws_url="/optimize/stream/abc", resolved_device="cpu")
    assert a.model_dump() == {
        "job_id": "abc",
        "ws_url": "/optimize/stream/abc",
        "resolved_device": "cpu",
    }


def test_optimize_error_minimal():
    e = OptimizeError(error="boom")
    assert e.model_dump() == {"error": "boom"}


def test_done_frame_carries_glsl_and_params():
    f = DoneFrame(type="done", final_params={"freq_x": 10.0}, glsl="void main(){}", loss=0.0)
    assert f.type == "done"
    assert f.final_params == {"freq_x": 10.0}


def test_progress_frame_validates_required_fields():
    f = ProgressFrame(type="progress", step=10, total=500, loss=0.42, preview_b64="data:image/jpeg;base64,x")
    assert f.step == 10


def test_error_frame_validates():
    f = ErrorFrame(type="error", message="x")
    assert f.message == "x"
