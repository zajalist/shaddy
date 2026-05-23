"""Parallel-init optimizer harness.

Runs N independently-seeded Adam chains in lockstep on the same target image.
Streams ProgressFrames from the current-best chain (lowest loss right now);
returns the DoneFrame from the chain with lowest final loss.

CPU shortcut: device=='cpu' is already slow at LPIPS forward; running N chains
would push wall-clock well past the spec budget. So on CPU we fall through to
single-init via run_optimization. The 'parallel' magic only kicks in on GPU.

Set _PARALLEL_CPU_SHORTCUT = False (e.g. in tests) to force the parallel path
on CPU for testing.
"""

import asyncio
import math
import time
from typing import AsyncIterator

import torch

from app import templates as templates_pkg
from app.jobs import Job
from app.schemas import DoneFrame, ErrorFrame, OptimizeFrame, ProgressFrame
from optim import glsl_fill, image, loss
from optim.runner import (
    CPU_MAX_STEPS,
    CPU_RES,
    GPU_MAX_STEPS,
    GPU_RES,
    LEARNING_RATE,
    PROGRESS_EVERY_N,
    TEMPLATE_RENDERERS,
    _params_to_json,
    run_optimization,
)

DEFAULT_N_INITS: int = 3
FLOAT_PERTURB_PCT: float = 0.10   # ±10% on float params
COLOR_PERTURB_ABS: float = 0.10   # ±0.10 on vec3 colors

_PARALLEL_CPU_SHORTCUT: bool = True


def _make_perturbed_params(defaults: dict, device: str, seed: int) -> dict[str, torch.Tensor]:
    """Defaults plus seeded random perturbation. Returns differentiable tensors."""
    gen = torch.Generator(device="cpu").manual_seed(seed)
    out: dict[str, torch.Tensor] = {}
    for k, v in defaults.items():
        if isinstance(v, list):
            base = torch.tensor(v, dtype=torch.float32)
            jitter = (torch.rand(base.shape, generator=gen) * 2 - 1) * COLOR_PERTURB_ABS
            t = (base + jitter).clamp(0.0, 1.0).to(device).detach().requires_grad_(True)
        else:
            base = float(v)
            jitter = (torch.rand((), generator=gen).item() * 2 - 1) * FLOAT_PERTURB_PCT
            t = torch.tensor(base * (1.0 + jitter), dtype=torch.float32, device=device, requires_grad=True)
        out[k] = t
    return out


async def run_parallel(job: Job, n_inits: int = DEFAULT_N_INITS) -> AsyncIterator[OptimizeFrame]:
    if n_inits < 1:
        raise ValueError("n_inits must be >= 1")

    if _PARALLEL_CPU_SHORTCUT and job.resolved_device == "cpu":
        async for frame in run_optimization(job):
            yield frame
        return

    device = job.resolved_device
    if device == "cpu":
        h, w = CPU_RES
        steps = min(job.max_steps, CPU_MAX_STEPS)
    else:
        h, w = GPU_RES
        steps = min(job.max_steps, GPU_MAX_STEPS)

    target = image.decode_to_tensor(job.image_bytes, device=device, size=(w, h))
    perceptual = loss.PerceptualLoss(device=device)
    template_src = templates_pkg.glsl(job.template_id)
    render_fn = TEMPLATE_RENDERERS[job.template_id]
    defaults = templates_pkg.defaults(job.template_id)

    chains: list[dict] = []
    for seed in range(n_inits):
        params = _make_perturbed_params(defaults, device=device, seed=seed)
        chains.append({
            "id": seed,
            "params": params,
            "optimizer": torch.optim.Adam(list(params.values()), lr=LEARNING_RATE),
            "loss": float("inf"),
            "rendered": torch.zeros(h, w, 3, device=device),
        })

    start = time.monotonic()

    for step in range(steps):
        for chain in chains:
            chain["optimizer"].zero_grad()
            chain["rendered"] = render_fn(chain["params"], h=h, w=w, t=0.0)
            loss_val = perceptual(chain["rendered"], target)
            loss_val.backward()
            chain["optimizer"].step()
            chain["loss"] = float(loss_val.item())

        if step % PROGRESS_EVERY_N == 0:
            valid = [c for c in chains if not math.isnan(c["loss"])]
            if not valid:
                yield ErrorFrame(type="error", message="all parallel chains diverged")
                return
            best = min(valid, key=lambda c: c["loss"])
            yield ProgressFrame(
                type="progress",
                step=step,
                total=steps,
                loss=best["loss"],
                preview_b64=image.encode_jpeg_b64(best["rendered"]),
            )
            await asyncio.sleep(0)

        if time.monotonic() - start > job.wall_clock_cap_sec:
            break

    valid = [c for c in chains if not math.isnan(c["loss"])]
    if not valid:
        yield ErrorFrame(type="error", message="all parallel chains diverged")
        return
    best = min(valid, key=lambda c: c["loss"])
    final_params = _params_to_json(best["params"])
    final_glsl = glsl_fill.fill(template_src, final_params)
    yield DoneFrame(
        type="done",
        final_params=final_params,
        glsl=final_glsl,
        loss=best["loss"],
    )
