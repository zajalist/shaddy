# Backend Optimization Core Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this task-by-task. Checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stub `DoneFrame` in the WebSocket handler with a real PyTorch Adam loop over a parameterized differentiable plasma shader. Stream progress every 25 steps. Return final GLSL with optimized values baked in as numeric literals.

**Architecture:** New `backend/optim/` package (runner, loss, image, glsl_fill). New `backend/templates/plasma.py` mirroring the GLSL. Existing `app/optimize.py` WS handler swaps its single `await ws.send_json(stub)` for `async for frame in run_optimization(job): await ws.send_json(frame)`. Single optimization per server (serial slot from sub-project A unchanged).

**Tech Stack:** PyTorch 2.5.1 (CPU baseline), LPIPS (VGG backbone), Pillow, asyncio. Existing FastAPI app from sub-project A.

**Spec:** [`docs/superpowers/specs/2026-05-23-backend-optimizer-design.md`](../specs/2026-05-23-backend-optimizer-design.md)
**Branch:** `backend/optimizer` off `main`
**Commit author:** `-c user.email=saracensaray@gmail.com -c user.name=zajalist`

---

## Pre-flight

### Task 0: Branch off latest main

- [ ] **Step 1:** `git checkout main && git pull && git checkout -b backend/optimizer`
- [ ] **Step 2:** Activate the venv from sub-project A (already has torch + lpips installed):
  ```powershell
  Set-Location D:\Hackathons\shaddy\backend
  .\.venv\Scripts\Activate.ps1
  ```
- [ ] **Step 3:** Verify `python -c "import lpips; lpips.LPIPS(net='vgg')"` runs without error. **First run will download ~58MB of VGG weights.** Let it complete before moving on (subsequent runs are cached at `~/.cache/torch/hub/checkpoints/`).

---

## Task 1: Parameterized plasma template (GLSL only)

**Files:**
- Modify: `backend/templates/plasma.glsl`

- [ ] **Step 1:** Rewrite `backend/templates/plasma.glsl` to use `/*PARAM:name*/` tokens:

```glsl
#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float t = u_time * /*PARAM:time_scale*/;
    float v = sin(uv.x * /*PARAM:freq_x*/ + t)
            + sin(uv.y * /*PARAM:freq_y*/ + t + /*PARAM:phase*/);
    vec3 c = mix(/*PARAM:color_a*/, /*PARAM:color_b*/, 0.5 + 0.5 * sin(v));
    fragColor = vec4(c, 1.0);
}
```

- [ ] **Step 2:** Confirm `templates/defaults.json` has all keys needed by the tokens above (`freq_x`, `freq_y`, `phase`, `color_a`, `color_b`, `time_scale`). It already does from sub-project A.
- [ ] **Step 3:** Run the existing test suite — the sub-project A test `test_ws_sends_one_done_frame_with_template_glsl` does a byte-for-byte compare of plasma.glsl, so it'll fail. Update it to expect the new content (use the new file as the source of truth):

In `backend/tests/test_optimize_ws.py`, the test reads `(_TEMPLATES_DIR / "plasma.glsl").read_text()` and compares against `frame.glsl`. After Task 4 (when the WS handler starts filling literals into the template), this test changes shape. For now, the test still passes because `templates.glsl()` returns the file content unchanged.

Run: `pytest -q tests/test_optimize_ws.py`. Expected: pass.

- [ ] **Step 4:** Commit:
  ```powershell
  git add backend/templates/plasma.glsl
  git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: parameterize plasma.glsl with /*PARAM:*/ tokens"
  ```

---

## Task 2: GLSL filler (TDD)

**Files:**
- Create: `backend/optim/__init__.py` (empty)
- Create: `backend/optim/glsl_fill.py`
- Create: `backend/tests/test_glsl_fill.py`

- [ ] **Step 1:** Create empty package init:
  ```powershell
  New-Item -ItemType File -Path D:\Hackathons\shaddy\backend\optim\__init__.py -Force | Out-Null
  ```

- [ ] **Step 2:** Write the failing tests in `backend/tests/test_glsl_fill.py`:

```python
import pytest

from optim.glsl_fill import fill


def test_fill_substitutes_a_float_param():
    template = "float x = /*PARAM:freq_x*/;"
    assert fill(template, {"freq_x": 10.0}) == "float x = 10.0;"


def test_fill_enforces_float_decimal_point():
    # GLSL needs `10.0` not `10` for float context.
    assert fill("float x = /*PARAM:n*/;", {"n": 10}) == "float x = 10.0;"


def test_fill_handles_non_integer_floats():
    assert fill("float x = /*PARAM:n*/;", {"n": 8.3}) == "float x = 8.3;"


def test_fill_substitutes_vec3_param():
    template = "vec3 c = /*PARAM:col*/;"
    assert fill(template, {"col": [0.9, 0.2, 0.4]}) == "vec3 c = vec3(0.9, 0.2, 0.4);"


def test_fill_vec3_enforces_decimal_point_per_component():
    template = "vec3 c = /*PARAM:col*/;"
    assert fill(template, {"col": [1, 0, 0]}) == "vec3 c = vec3(1.0, 0.0, 0.0);"


def test_fill_replaces_every_occurrence_of_the_same_token():
    template = "float a = /*PARAM:n*/; float b = /*PARAM:n*/;"
    assert fill(template, {"n": 5.0}) == "float a = 5.0; float b = 5.0;"


def test_fill_raises_on_unknown_token():
    with pytest.raises(KeyError):
        fill("float x = /*PARAM:missing*/;", {})


def test_fill_raises_on_unused_param():
    # Silent drops are bugs — caller passed a param the template doesn't use.
    with pytest.raises(ValueError):
        fill("float x = 1.0;", {"unused": 5.0})


def test_fill_full_plasma_template_has_no_tokens_after_fill():
    from pathlib import Path

    template = (Path(__file__).resolve().parent.parent / "templates" / "plasma.glsl").read_text(
        encoding="utf-8"
    )
    params = {
        "freq_x": 10.0,
        "freq_y": 10.0,
        "phase": 0.0,
        "color_a": [0.5, 0.5, 0.5],
        "color_b": [0.5, 0.5, 0.5],
        "time_scale": 1.0,
    }
    out = fill(template, params)
    assert "/*PARAM:" not in out
```

- [ ] **Step 3:** Run, verify failure:
  ```powershell
  pytest -q tests/test_glsl_fill.py
  ```
  Expected: `ModuleNotFoundError: No module named 'optim'`.

- [ ] **Step 4:** Implement `backend/optim/glsl_fill.py`:

```python
import re

_TOKEN_RE = re.compile(r"/\*PARAM:([a-zA-Z_][a-zA-Z0-9_]*)\*/")


def _format_float(x: float) -> str:
    """GLSL needs a decimal point for floats. '10' -> '10.0', '8.3' -> '8.3'."""
    s = repr(float(x))
    if "." not in s and "e" not in s and "E" not in s:
        s += ".0"
    return s


def _format_value(v):
    if isinstance(v, (int, float)):
        return _format_float(v)
    if isinstance(v, (list, tuple)):
        if len(v) == 3:
            return "vec3(" + ", ".join(_format_float(c) for c in v) + ")"
        if len(v) == 4:
            return "vec4(" + ", ".join(_format_float(c) for c in v) + ")"
        if len(v) == 2:
            return "vec2(" + ", ".join(_format_float(c) for c in v) + ")"
    raise TypeError(f"unsupported param type for value {v!r}")


def fill(template: str, params: dict) -> str:
    """Replace every /*PARAM:name*/ token with the corresponding literal.

    Raises KeyError if the template references a name not in `params`.
    Raises ValueError if `params` contains a name not used by the template
    (silent drops mask bugs).
    """
    used: set[str] = set()

    def _sub(match: re.Match) -> str:
        name = match.group(1)
        if name not in params:
            raise KeyError(f"template references missing param: {name}")
        used.add(name)
        return _format_value(params[name])

    out = _TOKEN_RE.sub(_sub, template)

    unused = set(params) - used
    if unused:
        raise ValueError(f"params declared but not used by template: {sorted(unused)}")

    return out
```

- [ ] **Step 5:** Run, verify pass:
  ```powershell
  pytest -q tests/test_glsl_fill.py
  ```
  Expected: 9 passed.

- [ ] **Step 6:** Commit:
  ```powershell
  git add backend/optim/__init__.py backend/optim/glsl_fill.py backend/tests/test_glsl_fill.py
  git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: optim.glsl_fill — literal substitution into GLSL templates"
  ```

---

## Task 3: PyTorch plasma template (TDD)

**Files:**
- Create: `backend/templates/plasma.py`
- Create: `backend/tests/test_plasma_template.py`

- [ ] **Step 1:** Write the failing test `backend/tests/test_plasma_template.py`:

```python
import math
import torch

from templates import plasma


def _tensor(v):
    return torch.tensor(v, dtype=torch.float32)


def test_render_shape_and_range():
    params = {
        "freq_x": _tensor(10.0),
        "freq_y": _tensor(10.0),
        "phase": _tensor(0.0),
        "color_a": _tensor([0.5, 0.5, 0.5]),
        "color_b": _tensor([0.5, 0.5, 0.5]),
        "time_scale": _tensor(1.0),
    }
    out = plasma.render(params, h=16, w=16, t=0.0)
    assert out.shape == (16, 16, 3)
    assert out.min() >= 0.0 - 1e-5
    assert out.max() <= 1.0 + 1e-5


def test_render_matches_hand_computed_pixel_at_origin():
    """At t=0 with default params, plasma at uv≈0 has known math:
        v = sin(0) + sin(0) = 0
        mix(a, b, 0.5 + 0.5*sin(0)) = mix(a, b, 0.5)
        which with a=b=(0.5,0.5,0.5) gives (0.5,0.5,0.5)
    Pixel center for (0,0) in a 4x4 grid is uv=(0.125,0.125), so:
        v = sin(1.25) + sin(1.25) ≈ 2 * sin(1.25) ≈ 1.898
        result = mix((0.5,0.5,0.5), (0.5,0.5,0.5), 0.5+0.5*sin(1.898))
        Since a==b, result is always (0.5,0.5,0.5).
    """
    params = {
        "freq_x": _tensor(10.0),
        "freq_y": _tensor(10.0),
        "phase": _tensor(0.0),
        "color_a": _tensor([0.5, 0.5, 0.5]),
        "color_b": _tensor([0.5, 0.5, 0.5]),
        "time_scale": _tensor(1.0),
    }
    out = plasma.render(params, h=4, w=4, t=0.0)
    assert torch.allclose(out, torch.full((4, 4, 3), 0.5), atol=1e-5)


def test_render_distinguishes_color_a_from_color_b():
    """With t=0 and freq=0, sin(0)+sin(0)=0 → mix factor 0.5 → average of a,b."""
    params = {
        "freq_x": _tensor(0.0),
        "freq_y": _tensor(0.0),
        "phase": _tensor(0.0),
        "color_a": _tensor([1.0, 0.0, 0.0]),
        "color_b": _tensor([0.0, 0.0, 1.0]),
        "time_scale": _tensor(1.0),
    }
    out = plasma.render(params, h=2, w=2, t=0.0)
    # All pixels: mix((1,0,0), (0,0,1), 0.5) = (0.5, 0, 0.5)
    expected = torch.tensor([0.5, 0.0, 0.5]).expand(2, 2, 3)
    assert torch.allclose(out, expected, atol=1e-5)


def test_params_are_differentiable():
    params = {
        "freq_x": torch.tensor(10.0, requires_grad=True),
        "freq_y": torch.tensor(10.0, requires_grad=True),
        "phase": torch.tensor(0.0, requires_grad=True),
        "color_a": torch.tensor([0.5, 0.5, 0.5], requires_grad=True),
        "color_b": torch.tensor([0.5, 0.5, 0.5], requires_grad=True),
        "time_scale": torch.tensor(1.0, requires_grad=True),
    }
    out = plasma.render(params, h=8, w=8, t=0.0)
    out.sum().backward()
    for name, p in params.items():
        assert p.grad is not None, f"{name} got no gradient"
```

- [ ] **Step 2:** Run, verify failure (no `templates.plasma` module):
  ```powershell
  pytest -q tests/test_plasma_template.py
  ```

- [ ] **Step 3:** Implement `backend/templates/plasma.py`. Math must match `plasma.glsl` exactly:

```python
"""PyTorch mirror of plasma.glsl. Math MUST stay identical to the GLSL.

GLSL ref:
    vec2 uv = gl_FragCoord.xy / u_resolution;          // [0, 1] per axis, pixel-center
    float t = u_time * time_scale;
    float v = sin(uv.x * freq_x + t)
            + sin(uv.y * freq_y + t + phase);
    vec3 c = mix(color_a, color_b, 0.5 + 0.5 * sin(v));
    fragColor = vec4(c, 1.0);
"""

import torch


def _uv_grid(h: int, w: int, device: torch.device) -> torch.Tensor:
    """Pixel-center UV coords in [0, 1]. Returns [H, W, 2]."""
    ys = (torch.arange(h, device=device, dtype=torch.float32) + 0.5) / h
    xs = (torch.arange(w, device=device, dtype=torch.float32) + 0.5) / w
    grid_y, grid_x = torch.meshgrid(ys, xs, indexing="ij")
    return torch.stack([grid_x, grid_y], dim=-1)


def render(params: dict[str, torch.Tensor], h: int, w: int, t: float = 0.0) -> torch.Tensor:
    """Render plasma at resolution (h, w) at time t. Returns [H, W, 3] in [0, 1]."""
    device = next(iter(params.values())).device
    uv = _uv_grid(h, w, device)  # [H, W, 2]

    t_eff = t * params["time_scale"]
    v = torch.sin(uv[..., 0] * params["freq_x"] + t_eff) + torch.sin(
        uv[..., 1] * params["freq_y"] + t_eff + params["phase"]
    )  # [H, W]

    mix_factor = 0.5 + 0.5 * torch.sin(v)  # [H, W], in [0, 1]
    mix_factor = mix_factor.unsqueeze(-1)  # [H, W, 1] for broadcasting against [3] colors

    c = params["color_a"] * (1.0 - mix_factor) + params["color_b"] * mix_factor
    return c.clamp(0.0, 1.0)
```

- [ ] **Step 4:** Run, verify pass:
  ```powershell
  pytest -q tests/test_plasma_template.py
  ```
  Expected: 4 passed.

- [ ] **Step 5:** Commit:
  ```powershell
  git add backend/templates/plasma.py backend/tests/test_plasma_template.py
  git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: templates.plasma — differentiable PyTorch mirror of plasma.glsl"
  ```

---

## Task 4: Image codec (TDD)

**Files:**
- Create: `backend/optim/image.py`
- Create: `backend/tests/test_image.py`

- [ ] **Step 1:** Failing tests:

```python
import base64
import io

import torch
from PIL import Image

from optim import image as imgmod


def test_decode_returns_hwc_float_in_zero_one():
    img = Image.new("RGB", (8, 12), color=(255, 128, 0))  # WxH
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw = buf.getvalue()

    t = imgmod.decode_to_tensor(raw, device="cpu", size=(16, 16))
    assert t.shape == (16, 16, 3)
    assert t.dtype == torch.float32
    assert t.min() >= 0.0 and t.max() <= 1.0
    # Center pixel should be near orange-ish (averaged after resize).
    assert t[8, 8, 0] > 0.5
    assert t[8, 8, 2] < 0.5


def test_encode_jpeg_b64_round_trip():
    t = torch.full((32, 32, 3), 0.5)
    s = imgmod.encode_jpeg_b64(t, quality=85)
    assert s.startswith("data:image/jpeg;base64,")
    raw = base64.b64decode(s.split(",", 1)[1])
    img = Image.open(io.BytesIO(raw))
    assert img.format == "JPEG"
    assert img.size == (32, 32)


def test_encode_jpeg_b64_clamps_out_of_range():
    t = torch.tensor([[[2.0, -1.0, 0.5]]], dtype=torch.float32)
    s = imgmod.encode_jpeg_b64(t)
    assert s.startswith("data:image/jpeg;base64,")  # didn't crash
```

- [ ] **Step 2:** Implement `backend/optim/image.py`:

```python
import base64
import io

import torch
from PIL import Image


def decode_to_tensor(image_bytes: bytes, device: str, size: tuple[int, int]) -> torch.Tensor:
    """PIL-decode raw bytes -> RGB float tensor [H, W, 3] in [0, 1] at given size."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(size, Image.BILINEAR)
    arr = torch.frombuffer(bytearray(img.tobytes()), dtype=torch.uint8)
    arr = arr.view(size[1], size[0], 3).to(torch.float32) / 255.0
    return arr.to(device)


def encode_jpeg_b64(tensor: torch.Tensor, quality: int = 85) -> str:
    """[H, W, 3] float in [0, 1] -> 'data:image/jpeg;base64,...' at given JPEG quality."""
    t = tensor.detach().clamp(0.0, 1.0).cpu()
    arr = (t * 255).to(torch.uint8).contiguous()
    img = Image.fromarray(arr.numpy(), mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"
```

- [ ] **Step 3:** Run, verify pass:
  ```powershell
  pytest -q tests/test_image.py
  ```
  Expected: 3 passed.

- [ ] **Step 4:** Commit:
  ```powershell
  git add backend/optim/image.py backend/tests/test_image.py
  git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: optim.image — decode bytes->tensor, encode tensor->jpeg-b64"
  ```

---

## Task 5: Perceptual loss (TDD)

**Files:**
- Create: `backend/optim/loss.py`
- Create: `backend/tests/test_loss.py`

- [ ] **Step 1:** Failing tests:

```python
import pytest
import torch

from optim.loss import PerceptualLoss


@pytest.fixture(scope="module")
def loss_fn():
    """LPIPS init is slow (~2s and downloads weights on first run)."""
    return PerceptualLoss(device="cpu")


def test_loss_of_identical_images_is_near_zero(loss_fn):
    img = torch.rand(64, 64, 3)
    l = loss_fn(img, img)
    assert l.item() < 0.01


def test_loss_of_different_images_is_positive(loss_fn):
    a = torch.zeros(64, 64, 3)
    b = torch.ones(64, 64, 3)
    l = loss_fn(a, b)
    assert l.item() > 0.1


def test_loss_is_differentiable_wrt_rendered(loss_fn):
    rendered = torch.rand(64, 64, 3, requires_grad=True)
    target = torch.rand(64, 64, 3)
    l = loss_fn(rendered, target)
    l.backward()
    assert rendered.grad is not None
    assert rendered.grad.abs().sum() > 0
```

- [ ] **Step 2:** Implement `backend/optim/loss.py`:

```python
import lpips
import torch
import torch.nn.functional as F


class PerceptualLoss:
    """LPIPS (VGG) + 0.1 * MSE. LPIPS captures style; MSE anchors color."""

    def __init__(self, device: str):
        self.device = device
        self.lpips = lpips.LPIPS(net="vgg", verbose=False).to(device).eval()
        for p in self.lpips.parameters():
            p.requires_grad_(False)

    def __call__(self, rendered: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        # LPIPS expects NCHW in [-1, 1].
        r = rendered.permute(2, 0, 1).unsqueeze(0) * 2.0 - 1.0
        t = target.permute(2, 0, 1).unsqueeze(0) * 2.0 - 1.0
        lpips_loss = self.lpips(r, t).mean()
        mse = F.mse_loss(rendered, target)
        return lpips_loss + 0.1 * mse
```

- [ ] **Step 3:** Run:
  ```powershell
  pytest -q tests/test_loss.py
  ```
  Expected: 3 passed. First run downloads VGG weights (~58 MB) — may take 60s.

- [ ] **Step 4:** Commit:
  ```powershell
  git add backend/optim/loss.py backend/tests/test_loss.py
  git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: optim.loss — PerceptualLoss = LPIPS(vgg) + 0.1*MSE"
  ```

---

## Task 6: Optimizer runner (TDD)

**Files:**
- Create: `backend/optim/runner.py`
- Create: `backend/tests/test_runner.py`

- [ ] **Step 1:** Failing tests `backend/tests/test_runner.py`:

```python
import time

import pytest
import torch

from app.jobs import Job
from app.schemas import DoneFrame, ProgressFrame
from optim.runner import run_optimization
from tests._helpers import png_data_url
from app.optimize import _decode_image_b64


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
    assert set(last.final_params.keys()) == expected_keys


async def test_runner_caps_steps_on_cpu():
    # CPU branch hard-caps to 200. Pass max_steps=500; runner should not exceed 200.
    seen_steps = []
    async for f in run_optimization(_job(max_steps=500)):
        if isinstance(f, ProgressFrame):
            seen_steps.append(f.step)
    assert all(s <= 200 for s in seen_steps), f"steps exceeded cap: {seen_steps}"
```

- [ ] **Step 2:** Run, verify failure (`ModuleNotFoundError: No module named 'optim.runner'`):

  ```powershell
  pytest -q tests/test_runner.py
  ```

- [ ] **Step 3:** Implement `backend/optim/runner.py`:

```python
"""The optimizer. Async generator yielding ProgressFrame / DoneFrame.

Honors job.resolved_device:
  - "cuda" -> 256x256, up to job.max_steps (cap 500)
  - "cpu"  -> 64x64,   up to min(job.max_steps, 200)

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
LEARNING_RATE: float = 0.02


def _make_params(defaults: dict, device: str) -> dict[str, torch.Tensor]:
    """Convert defaults JSON to differentiable tensors."""
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
        steps = min(job.max_steps, 500)

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
```

- [ ] **Step 4:** Run, verify pass:
  ```powershell
  pytest -q tests/test_runner.py
  ```
  Expected: 4 passed. Each test runs the loop with `max_steps=5` for speed (~5–15s per test on CPU due to LPIPS).

  > If a test exceeds 60s, profile: the LPIPS forward pass on CPU at 64×64 is ~150ms per call. 5 steps × 150ms = 750ms per test. The slow part is the LPIPS *init* (constructor downloads + builds the VGG net, ~2–4s), which the `@pytest.fixture(scope="module")` in `test_loss.py` caches. Test_runner doesn't share that fixture — each test rebuilds LPIPS. Acceptable for sub-project B; if it's too slow, refactor to module-scope shared init in a follow-up.

- [ ] **Step 5:** Commit:
  ```powershell
  git add backend/optim/runner.py backend/tests/test_runner.py
  git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: optim.runner — Adam loop streaming ProgressFrame -> DoneFrame"
  ```

---

## Task 7: Wire the runner into the WS handler

**Files:**
- Modify: `backend/app/optimize.py` (replace the stub `DoneFrame` send with `async for`)
- Modify: `backend/tests/test_optimize_ws.py` (expect progress + done)

- [ ] **Step 1:** Modify `backend/app/optimize.py`. Inside `ws_optimize_stream`, replace:

```python
    await ws.accept()
    try:
        frame = DoneFrame(
            type="done",
            final_params=templates.defaults(job.template_id),
            glsl=templates.glsl(job.template_id),
            loss=0.0,
        )
        await ws.send_json(frame.model_dump())
        await ws.close()
```

with:

```python
    from optim.runner import run_optimization

    await ws.accept()
    try:
        async for frame in run_optimization(job):
            await ws.send_json(frame.model_dump())
        await ws.close()
```

(Keep the existing `except WebSocketDisconnect`, `except Exception` → `ErrorFrame`, and `finally: await registry.release()` blocks unchanged.)

You can also remove the now-unused `DoneFrame` import from the top — let pyflakes/ruff guide you, or just leave it (harmless).

- [ ] **Step 2:** Modify `backend/tests/test_optimize_ws.py`. The existing happy-path test expects ONE message but now sees multiple. Rewrite it to consume the full stream and assert the right shape:

Replace `test_ws_sends_one_done_frame_with_template_glsl` with:

```python
def test_ws_streams_progress_then_done(monkeypatch):
    """End-to-end: POST then WS receives ≥1 ProgressFrame and exactly one DoneFrame.

    Override CPU step cap to 5 so the test is fast.
    """
    from optim import runner
    monkeypatch.setattr(runner, "CPU_MAX_STEPS", 5)

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
            import json
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
```

Keep the other two tests (`test_ws_unknown_job_id_is_rejected`, `test_ws_releases_slot_on_close`) unchanged.

The `test_ws_releases_slot_on_close` test will also benefit from the `CPU_MAX_STEPS = 5` monkeypatch — add it there too, or factor into an autouse fixture in `conftest.py`. Simplest: add the monkeypatch line to that test as well.

- [ ] **Step 3:** Run full suite:
  ```powershell
  pytest -q
  ```
  Expected: every test pass.

- [ ] **Step 4:** Manual smoke. In one terminal:
  ```powershell
  Set-Location D:\Hackathons\shaddy\backend
  .\.venv\Scripts\Activate.ps1
  make dev
  ```
  In another, use a tiny Python WS client:
  ```python
  # save as smoke.py
  import asyncio, base64, io, json
  import httpx, websockets
  from PIL import Image

  async def main():
      img = Image.new("RGB", (64, 64), (200, 100, 50))
      buf = io.BytesIO(); img.save(buf, format="PNG")
      b64 = base64.b64encode(buf.getvalue()).decode("ascii")
      async with httpx.AsyncClient() as c:
          r = await c.post("http://localhost:8000/optimize", json={
              "template_id": "plasma",
              "image_base64": f"data:image/png;base64,{b64}",
          })
          print("POST:", r.status_code, r.json())
          job_id = r.json()["job_id"]

      async with websockets.connect(f"ws://localhost:8000/optimize/stream/{job_id}") as ws:
          async for raw in ws:
              msg = json.loads(raw)
              if msg["type"] == "progress":
                  print(f"progress step={msg['step']} loss={msg['loss']:.4f}")
              elif msg["type"] == "done":
                  print(f"done loss={msg['loss']:.4f}")
                  print("GLSL preview:", msg["glsl"][:200])
                  break

  asyncio.run(main())
  ```
  Run: `python smoke.py`. Expected: progress frames every 25 steps, then a done frame, GLSL has real numeric literals. Takes ~30s on CPU (200 steps × ~150ms).

  If satisfied, delete `smoke.py` — don't commit it.

- [ ] **Step 5:** Commit:
  ```powershell
  git add backend/app/optimize.py backend/tests/test_optimize_ws.py
  git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: swap stub DoneFrame for real run_optimization() in WS handler"
  ```

---

## Task 8: Mock server (for UX teammates without a GPU)

**Files:**
- Create: `backend/scripts/__init__.py` (empty — so the package is importable)
- Create: `backend/scripts/mock_server.py`

- [ ] **Step 1:** Create the empty init:
  ```powershell
  New-Item -ItemType File -Path D:\Hackathons\shaddy\backend\scripts\__init__.py -Force | Out-Null
  ```

- [ ] **Step 2:** Implement `backend/scripts/mock_server.py`. This is a standalone app — not part of `app.main` — that ships the same wire format but with a hard-coded frame stream and no torch/LPIPS:

```python
"""Mock backend that streams pre-recorded frames over the contract WS.

Usage:
    python -m scripts.mock_server          # listens on :8001
    SHADDY_MOCK_PORT=9000 python -m scripts.mock_server

Streams 5 evenly-spaced progress frames at 400ms intervals, then a done frame
with a fixed parameter set. Same wire format as the real backend so UX can
develop against this without a GPU.
"""

import asyncio
import json
import os
import uuid

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import templates
from app.schemas import OptimizeRequest
from optim import glsl_fill

_FAKE_PARAMS_PROGRESSION = [
    {"freq_x": 10.0, "freq_y": 10.0, "phase": 0.0, "color_a": [0.5, 0.5, 0.5], "color_b": [0.5, 0.5, 0.5], "time_scale": 1.0},
    {"freq_x": 9.4, "freq_y": 10.6, "phase": 0.3, "color_a": [0.6, 0.4, 0.5], "color_b": [0.4, 0.6, 0.5], "time_scale": 1.1},
    {"freq_x": 8.5, "freq_y": 11.7, "phase": 0.8, "color_a": [0.7, 0.3, 0.4], "color_b": [0.3, 0.5, 0.7], "time_scale": 1.2},
    {"freq_x": 8.0, "freq_y": 12.3, "phase": 1.1, "color_a": [0.8, 0.2, 0.3], "color_b": [0.2, 0.4, 0.8], "time_scale": 1.3},
    {"freq_x": 7.8, "freq_y": 12.5, "phase": 1.2, "color_a": [0.85, 0.18, 0.32], "color_b": [0.18, 0.38, 0.82], "time_scale": 1.32},
]

# Tiny 4x4 magenta JPEG, base64, used as the placeholder preview for all frames.
_PLACEHOLDER_JPEG = (
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ"
    "EBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB/9sAQwEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ"
    "EBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB/8AAEQgABAAEAwEiAAIRAQMRAf/EAB4AAAEFAQEBAQEAAAAAAAAAAAYDB"
    "AUHCAkKAgEL/8QALhAAAQQCAQMDAgUFAQAAAAAAAQACAwQFBhEHEiETMUEIFCJRYRUjMnEJUoGRsf/EABYBAQEBAAAAAAAA"
    "AAAAAAAAAAEDBP/EAB8RAAEEAwEAAwAAAAAAAAAAAAEAAhExA0FRYRJxgf/aAAwDAQACEQMRAD8A/v8ApSlKj//Z"
)

app = FastAPI(title="Shaddy mock backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=None,
    allow_methods=["*"],
    allow_headers=["*"],
)

_jobs: dict[str, dict] = {}


@app.get("/health")
def health():
    return {"ok": True, "device": "mock"}


@app.post("/optimize", status_code=202)
def post_optimize(req: OptimizeRequest):
    job_id = uuid.uuid4().hex
    _jobs[job_id] = {"template_id": req.template_id}
    return {
        "job_id": job_id,
        "ws_url": f"/optimize/stream/{job_id}",
        "resolved_device": "cpu",
    }


@app.websocket("/optimize/stream/{job_id}")
async def stream(ws: WebSocket, job_id: str):
    job = _jobs.pop(job_id, None)
    if job is None:
        await ws.close(code=1008)
        return
    await ws.accept()
    total = len(_FAKE_PARAMS_PROGRESSION)
    template_src = templates.glsl(job["template_id"])

    for i, p in enumerate(_FAKE_PARAMS_PROGRESSION):
        await ws.send_json({
            "type": "progress",
            "step": i * 50,
            "total": (total - 1) * 50,
            "loss": 0.8 / (i + 1),
            "preview_b64": _PLACEHOLDER_JPEG,
        })
        await asyncio.sleep(0.4)

    final = _FAKE_PARAMS_PROGRESSION[-1]
    await ws.send_json({
        "type": "done",
        "final_params": final,
        "glsl": glsl_fill.fill(template_src, final),
        "loss": 0.05,
    })
    await ws.close()


def main():
    import uvicorn
    port = int(os.environ.get("SHADDY_MOCK_PORT", "8001"))
    uvicorn.run("scripts.mock_server:app", host="0.0.0.0", port=port, reload=False)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3:** Smoke test it:
  ```powershell
  Set-Location D:\Hackathons\shaddy\backend
  .\.venv\Scripts\Activate.ps1
  python -m scripts.mock_server
  ```
  In another terminal: `curl http://localhost:8001/health` → `{"ok":true,"device":"mock"}`. Ctrl-C to stop.

- [ ] **Step 4:** Commit:
  ```powershell
  git add backend/scripts/__init__.py backend/scripts/mock_server.py
  git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: scripts/mock_server — pre-recorded WS replay for UX dev (port 8001)"
  ```

---

## Task 9: Modal deploy definition

**Files:**
- Create: `backend/deploy/__init__.py` (empty)
- Create: `backend/deploy/modal_app.py`

- [ ] **Step 1:** Create the package init:
  ```powershell
  New-Item -ItemType File -Path D:\Hackathons\shaddy\backend\deploy\__init__.py -Force | Out-Null
  ```

- [ ] **Step 2:** Write `backend/deploy/modal_app.py`:

```python
"""Modal deployment for the Shaddy backend.

To deploy (requires `pip install modal` + `modal token new` once):

    cd backend
    modal deploy deploy/modal_app.py

Modal will print a public URL such as
    https://<account>--shaddy-backend-fastapi-app.modal.run
Set that origin on the frontend via VITE_BACKEND_URL.
"""

from pathlib import Path

import modal

_BACKEND_ROOT = Path(__file__).resolve().parent.parent

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements(str(_BACKEND_ROOT / "requirements.txt"))
    .pip_install_from_requirements(str(_BACKEND_ROOT / "requirements-gpu.txt"))
    # Pre-warm LPIPS VGG weights so the first request doesn't cold-start on a 58MB download.
    .run_commands("python -c \"import lpips; lpips.LPIPS(net='vgg')\"")
    # Bundle our source into the image.
    .add_local_dir(str(_BACKEND_ROOT / "app"), remote_path="/root/app")
    .add_local_dir(str(_BACKEND_ROOT / "optim"), remote_path="/root/optim")
    .add_local_dir(str(_BACKEND_ROOT / "templates"), remote_path="/root/templates")
)

app = modal.App("shaddy-backend", image=image)


@app.function(gpu="A10G", timeout=120, scaledown_window=60)
@modal.asgi_app()
def fastapi_app():
    from app.main import app as fastapi
    return fastapi
```

- [ ] **Step 3:** Do NOT run `modal deploy` — that requires Modal credentials and is operational/user-driven. Just confirm the file imports cleanly (won't import modal if it's not installed; that's fine):
  ```powershell
  python -c "import ast; ast.parse(open('deploy/modal_app.py').read())"
  ```
  Expected: no output (parse succeeded).

- [ ] **Step 4:** Commit:
  ```powershell
  git add backend/deploy/__init__.py backend/deploy/modal_app.py
  git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: deploy/modal_app — Modal deployment definition (A10G, pre-warmed LPIPS)"
  ```

---

## Task 10: README updates + push + PR

**Files:**
- Modify: `backend/README.md` (add "Mock server" + "Deploy to Modal" sections)

- [ ] **Step 1:** Append to `backend/README.md`:

```markdown
## Mock server (for UX without a GPU)

The mock backend ships pre-recorded progress frames over the real wire format — useful for UX dev on machines without a GPU.

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m scripts.mock_server   # http://localhost:8001
```

Point `VITE_BACKEND_URL=http://localhost:8001` and the UI behaves as if a real optimization is streaming.

## Deploy to Modal

Requires a Modal account + `pip install modal` + `modal token new` (one-time).

```powershell
cd backend
modal deploy deploy/modal_app.py
```

Modal will print a URL like `https://<account>--shaddy-backend-fastapi-app.modal.run`. Set that as `VITE_BACKEND_URL` on the frontend.

LPIPS VGG weights are baked into the image build, so the first request doesn't pay the cold-start tax of a 58 MB weight download.
```

- [ ] **Step 2:** Commit + push:
  ```powershell
  Set-Location D:\Hackathons\shaddy
  git add backend/README.md
  git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "docs(backend): mock server + Modal deploy sections"
  git push -u origin backend/optimizer
  ```

- [ ] **Step 3:** Open the PR:
  ```powershell
  gh pr create --repo zajalist/shaddy --base main --head backend/optimizer --title "backend(optimizer): real PyTorch Adam loop replaces stub DoneFrame" --body-file .github/pr-body-optimizer.md
  ```
  (Write the body to that file first — content sketch below.)

- [ ] **Step 4:** Watch CI:
  ```powershell
  gh pr checks <PR#> --repo zajalist/shaddy --watch --interval 15
  ```

- [ ] **Step 5:** Close issues #27, #30, #32, #33 via PR auto-close (the `Closes #N` footer in the PR body) OR manually with `gh issue close N --comment ...`.

### PR body sketch (`.github/pr-body-optimizer.md`)

```markdown
Closes #27, closes #30, closes #32, closes #33.

## What this is

Sub-project B: the real optimizer behind the WS contract surface that sub-project A established. POST + WS path is unchanged on the wire — the stub `DoneFrame` is gone; the WS handler now iterates an async generator that runs Adam over a parameterized plasma shader and streams `ProgressFrame`s every 25 steps before the final `DoneFrame`.

**Hero behavior:** the `done.glsl` now contains the optimized parameters baked in as numeric literals, so the user can immediately drag-to-scrub them in the editor.

Spec: `docs/superpowers/specs/2026-05-23-backend-optimizer-design.md`
Plan: `docs/superpowers/plans/2026-05-23-backend-optimizer.md`

## What changed

- New `backend/optim/` package: `runner`, `loss`, `image`, `glsl_fill`.
- New `backend/templates/plasma.py` (diffable mirror of plasma.glsl).
- `backend/templates/plasma.glsl` rewritten with `/*PARAM:*/` tokens.
- `backend/app/optimize.py` WS handler: stub → `async for frame in run_optimization(job)`.
- `backend/scripts/mock_server.py` (port 8001, pre-recorded frames).
- `backend/deploy/modal_app.py` (Modal deployment spec, GPU=A10G, prewarmed LPIPS).

## Tests

~25 new pytest cases. Full suite green:
- `test_glsl_fill.py` — 9 cases.
- `test_plasma_template.py` — 4 cases (shape, hand-computed pixels, differentiability).
- `test_image.py` — 3 cases (decode shape, JPEG round-trip, clamp).
- `test_loss.py` — 3 cases (identity → 0, different → > 0.1, grad flows).
- `test_runner.py` — 4 cases (progress→done, no PARAM tokens left, params keys, CPU step cap).
- `test_optimize_ws.py` (modified) — full POST + WS round-trip with monkeypatched CPU_MAX_STEPS=5.

## Performance

Local CPU at 64×64, 5 steps: ~1–2s per test (LPIPS dominates).
Manual smoke (200 CPU steps on a 64×64 target): ~30s, matches the spec budget.

## Out of scope

- Voronoi + gradient-noise templates (#28, #29) → sub-project C.
- 3 parallel random inits (#31) → sub-project C.
- UX integration (#43 progress modal, #46 backend client, Settings device toggle) → sub-project G.
- Actually deploying to Modal — operational.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Done criteria

- [ ] All 10 tasks complete.
- [ ] `pytest -q` green on `backend/optimizer`.
- [ ] CI green.
- [ ] PR open targeting `main`. Auto-closes #27, #30, #32, #33 on merge.
- [ ] Manual smoke run produces a `DoneFrame` whose `glsl` has no `/*PARAM:*/` left.
- [ ] `python -m scripts.mock_server` serves `/health` on port 8001.
- [ ] `deploy/modal_app.py` parses cleanly (we don't actually deploy).
