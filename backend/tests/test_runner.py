import time

import pytest

from app.jobs import Job
from app.optimize import _decode_image_b64
from app.schemas import DoneFrame, ProgressFrame
from optim.runner import run_optimization
from tests._helpers import png_data_url


def _job(template_id: str = "plasma", max_steps: int = 5, image_bytes: bytes | None = None) -> Job:
    if image_bytes is None:
        image_bytes = _decode_image_b64(png_data_url())
    return Job(
        job_id="test",
        template_id=template_id,
        image_bytes=image_bytes,
        resolved_device="cpu",
        max_steps=max_steps,
        wall_clock_cap_sec=30,
        created_at=time.monotonic(),
    )


async def test_runner_yields_a_progress_frame_then_done():
    frames = []
    async for f in run_optimization(_job(max_steps=5)):
        frames.append(f)
    assert len(frames) >= 2
    assert isinstance(frames[0], ProgressFrame)
    assert frames[0].step == 0
    assert isinstance(frames[-1], DoneFrame)


async def test_done_frame_glsl_has_no_param_tokens():
    last = None
    async for f in run_optimization(_job(max_steps=5)):
        last = f
    assert isinstance(last, DoneFrame)
    assert "/*PARAM:" not in last.glsl
    assert "void main" in last.glsl


async def test_done_frame_final_params_keys_match_defaults():
    from app import templates

    expected_keys = set(templates.defaults("plasma").keys())
    last = None
    async for f in run_optimization(_job(max_steps=5)):
        last = f
    assert isinstance(last, DoneFrame)
    assert set(last.final_params.keys()) == expected_keys


async def test_runner_caps_steps_on_cpu(monkeypatch):
    """CPU branch hard-caps to CPU_MAX_STEPS regardless of job.max_steps.

    Override CPU_MAX_STEPS to 3 to keep this test fast; assert no step >= cap.
    """
    from optim import runner

    monkeypatch.setattr(runner, "CPU_MAX_STEPS", 3)
    seen_steps = []
    async for f in run_optimization(_job(max_steps=500)):
        if isinstance(f, ProgressFrame):
            seen_steps.append(f.step)
    assert all(s < 3 for s in seen_steps), f"steps exceeded cap: {seen_steps}"
