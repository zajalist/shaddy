"""The optimizer. Async generator yielding ProgressFrame / DoneFrame.

Honors job.resolved_device:
  - "cuda" -> 256x256, up to job.max_steps (cap 500)
  - "cpu"  -> 64x64,   up to min(job.max_steps, CPU_MAX_STEPS=200)

Yields ProgressFrame every PROGRESS_EVERY_N steps. Terminates with a single
DoneFrame containing the template GLSL with optimized params substituted as
numeric literals. Honors wall-clock cap via job.wall_clock_cap_sec.
"""

import asyncio
import time
from typing import AsyncIterator

import torch

from app import templates as templates_pkg
from app.jobs import Job
from app.schemas import DoneFrame, OptimizeFrame, ProgressFrame
from optim import glsl_fill, image, loss
from templates import plasma

PROGRESS_EVERY_N: int = 25
CPU_RES: tuple[int, int] = (64, 64)
GPU_RES: tuple[int, int] = (256, 256)
CPU_MAX_STEPS: int = 200
GPU_MAX_STEPS: int = 500
LEARNING_RATE: float = 0.02


def _make_params(defaults: dict, device: str) -> dict[str, torch.Tensor]:
    """Convert defaults JSON to differentiable tensors on the chosen device."""
    out: dict[str, torch.Tensor] = {}
    for k, v in defaults.items():
        if isinstance(v, list):
            t = torch.tensor(v, dtype=torch.float32, device=device, requires_grad=True)
        else:
            t = torch.tensor(float(v), dtype=torch.float32, device=device, requires_grad=True)
        out[k] = t
    return out


def _params_to_json(params: dict[str, torch.Tensor]) -> dict:
    out: dict = {}
    for k, v in params.items():
        if v.numel() == 1:
            out[k] = float(v.item())
        else:
            out[k] = [float(x) for x in v.detach().cpu().tolist()]
    return out


async def run_optimization(job: Job) -> AsyncIterator[OptimizeFrame]:
    device = job.resolved_device

    if device == "cpu":
        h, w = CPU_RES
        steps = min(job.max_steps, CPU_MAX_STEPS)
    else:
        h, w = GPU_RES
        steps = min(job.max_steps, GPU_MAX_STEPS)

    target = image.decode_to_tensor(job.image_bytes, device=device, size=(w, h))
    params = _make_params(templates_pkg.defaults(job.template_id), device=device)
    perceptual = loss.PerceptualLoss(device=device)
    optimizer = torch.optim.Adam(list(params.values()), lr=LEARNING_RATE)
    template_src = templates_pkg.glsl(job.template_id)

    start = time.monotonic()
    last_loss = float("inf")
    rendered = torch.zeros(h, w, 3, device=device)

    for step in range(steps):
        optimizer.zero_grad()
        rendered = plasma.render(params, h=h, w=w, t=0.0)
        loss_val = perceptual(rendered, target)
        loss_val.backward()
        optimizer.step()
        last_loss = float(loss_val.item())

        if step % PROGRESS_EVERY_N == 0:
            yield ProgressFrame(
                type="progress",
                step=step,
                total=steps,
                loss=last_loss,
                preview_b64=image.encode_jpeg_b64(rendered),
            )
            # Yield control to the event loop so the WS write can flush.
            await asyncio.sleep(0)

        if time.monotonic() - start > job.wall_clock_cap_sec:
            break

    final_params = _params_to_json(params)
    final_glsl = glsl_fill.fill(template_src, final_params)
    yield DoneFrame(
        type="done",
        final_params=final_params,
        glsl=final_glsl,
        loss=last_loss,
    )
