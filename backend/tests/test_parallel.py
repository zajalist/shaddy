import time

import pytest

from app.jobs import Job
from app.optimize import _decode_image_b64
from app.schemas import DoneFrame, ProgressFrame
from optim import parallel
from tests._helpers import png_data_url


def _job(template_id: str = "plasma", max_steps: int = 5) -> Job:
    return Job(
        job_id="test",
        template_id=template_id,
        image_bytes=_decode_image_b64(png_data_url()),
        resolved_device="cpu",
        max_steps=max_steps,
        wall_clock_cap_sec=30,
        created_at=time.monotonic(),
    )


async def test_n_inits_zero_raises():
    with pytest.raises(ValueError):
        async for _ in parallel.run_parallel(_job(), n_inits=0):
            pass


async def test_cpu_shortcut_falls_through_to_single_init(monkeypatch):
    """On CPU with shortcut enabled, run_parallel just delegates to run_optimization.

    Spy on run_optimization to confirm exactly one chain runs.
    """
    from optim import runner

    monkeypatch.setattr(runner, "CPU_MAX_STEPS", 3)
    monkeypatch.setattr(parallel, "_PARALLEL_CPU_SHORTCUT", True)

    call_count = {"n": 0}
    real = parallel.run_optimization

    async def spy(job):
        call_count["n"] += 1
        async for f in real(job):
            yield f

    monkeypatch.setattr(parallel, "run_optimization", spy)

    frames = []
    async for f in parallel.run_parallel(_job(), n_inits=3):
        frames.append(f)

    assert call_count["n"] == 1, "CPU shortcut should call run_optimization exactly once"
    assert any(isinstance(f, ProgressFrame) for f in frames)
    assert isinstance(frames[-1], DoneFrame)


async def test_parallel_path_runs_multiple_chains(monkeypatch):
    """Force the parallel path on CPU. Two chains, 3 steps. Done with a result."""
    from optim import runner

    monkeypatch.setattr(parallel, "_PARALLEL_CPU_SHORTCUT", False)
    monkeypatch.setattr(runner, "CPU_MAX_STEPS", 3)

    frames = []
    async for f in parallel.run_parallel(_job(), n_inits=2):
        frames.append(f)

    assert isinstance(frames[-1], DoneFrame)
    assert "/*PARAM:" not in frames[-1].glsl


async def test_perturbed_params_differ_by_seed():
    """Seeded perturbation must produce distinct initial params per seed."""
    defaults = {"freq_x": 10.0, "color_a": [0.5, 0.5, 0.5]}
    p0 = parallel._make_perturbed_params(defaults, device="cpu", seed=0)
    p1 = parallel._make_perturbed_params(defaults, device="cpu", seed=1)
    assert p0["freq_x"].item() != p1["freq_x"].item()
    assert not (p0["color_a"] == p1["color_a"]).all()
