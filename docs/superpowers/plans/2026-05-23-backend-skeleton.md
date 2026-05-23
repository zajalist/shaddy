# Backend Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Python service skeleton with full HTTP + WebSocket contract surface, so UX can build photo→shader UI against real endpoints that return stub data.

**Architecture:** FastAPI app with a single-slot serial `JobRegistry`. `POST /optimize` validates, resolves device, allocates a `job_id`, and parks the job behind a 10s TTL. `WS /optimize/stream/{id}` cancels the TTL, sends one stub `DoneFrame` containing template defaults + unmodified template GLSL, closes. The async-generator shape leaves a clean slot for sub-project B's real optimizer to plug in without touching the wire format.

**Tech Stack:** Python 3.11, FastAPI, uvicorn[standard], Pydantic v2, PyTorch (CPU baseline + optional CUDA overlay), Pillow, pytest + httpx + websockets.

**Spec:** [`docs/superpowers/specs/2026-05-23-backend-skeleton-design.md`](../specs/2026-05-23-backend-skeleton-design.md)
**Branch:** `backend/skeleton`
**PR target:** `main`
**Commit author:** every `git commit` in this plan uses `-c user.email=saracensaray@gmail.com -c user.name=zajalist`.

---

## Pre-flight: branch + venv

### Task 0: Create the working branch and Python venv

**Files:** none (environment only)

- [ ] **Step 1: Create + check out the branch**

```powershell
Set-Location D:\Hackathons\shaddy
git checkout -b backend/skeleton
```

Expected: `Switched to a new branch 'backend/skeleton'`

- [ ] **Step 2: Create the Python virtual environment**

```powershell
Set-Location D:\Hackathons\shaddy\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python --version
```

Expected: `Python 3.11.x`. If the version is different, install Python 3.11 from python.org before continuing — pinning matters because Modal images use 3.11.

- [ ] **Step 3: Add .venv to .gitignore** (already covered by root `.gitignore`'s `.venv/` entry — verify)

```powershell
Set-Location D:\Hackathons\shaddy
git check-ignore backend/.venv
```

Expected: `backend/.venv` printed (means it's ignored).

---

## Task 1: requirements files + Makefile

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/requirements-gpu.txt`
- Create: `backend/Makefile`

- [ ] **Step 1: Write `backend/requirements.txt` (CPU baseline)**

```
# Default install. Works on every machine including CI (no GPU).
# Devs with a CUDA GPU should additionally run:
#   pip install -r requirements-gpu.txt

fastapi==0.115.5
uvicorn[standard]==0.32.1
websockets==13.1
pydantic==2.10.3

# Torch CPU wheel (default index). Sub-project B uses these for optimization.
torch==2.5.1
torchvision==0.20.1
lpips==0.1.4

pillow==11.0.0
numpy==2.1.3

# Dev / test
pytest==8.3.4
pytest-asyncio==0.24.0
httpx==0.28.1
```

- [ ] **Step 2: Write `backend/requirements-gpu.txt` (CUDA overlay)**

```
# Run AFTER `pip install -r requirements.txt` to swap CPU torch for CUDA torch.
# Targets CUDA 12.1. If your driver supports a different CUDA, change the URL.

--extra-index-url https://download.pytorch.org/whl/cu121
torch==2.5.1+cu121
torchvision==0.20.1+cu121
```

- [ ] **Step 3: Write `backend/Makefile`**

```makefile
.PHONY: install install-gpu dev test lint clean

install:
	pip install -r requirements.txt

install-gpu: install
	pip install -r requirements-gpu.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest -q

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache
```

- [ ] **Step 4: Install dependencies**

```powershell
Set-Location D:\Hackathons\shaddy\backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Expected: every package installs successfully. ~3-5 minutes on first run (torch is large). If torch wheel fails, double-check Python version is 3.11.

- [ ] **Step 5: Commit**

```powershell
Set-Location D:\Hackathons\shaddy
git add backend/requirements.txt backend/requirements-gpu.txt backend/Makefile
git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: add requirements (CPU + GPU overlay) and Makefile"
```

---

## Task 2: App skeleton (empty package, conftest, smoke test)

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_smoke.py`

- [ ] **Step 1: Create empty package init files**

```powershell
New-Item -ItemType File -Path D:\Hackathons\shaddy\backend\app\__init__.py -Force | Out-Null
New-Item -ItemType File -Path D:\Hackathons\shaddy\backend\tests\__init__.py -Force | Out-Null
```

- [ ] **Step 2: Write `backend/app/main.py` (minimal — just constructs the app)**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Shaddy backend", version="0.1.0")

_default_origins = ["http://localhost:5173"]
_prod_origin = os.environ.get("SHADDY_FRONTEND_ORIGIN")
if _prod_origin:
    _default_origins.append(_prod_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins,
    # LAN dev (vite --host) + cloudflared quick tunnel.
    allow_origin_regex=r"^(http://[^/]+:5173|https://[^/]+\.trycloudflare\.com)$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- [ ] **Step 3: Write `backend/tests/conftest.py`**

```python
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
```

- [ ] **Step 4: Configure pytest-asyncio mode in `backend/pyproject.toml`**

Create `backend/pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
pythonpath = ["."]
```

- [ ] **Step 5: Write `backend/tests/test_smoke.py` (will fail — no route yet)**

```python
async def test_app_constructs_and_returns_404_for_unknown_route(client):
    r = await client.get("/__nope__")
    assert r.status_code == 404
```

- [ ] **Step 6: Run the smoke test**

```powershell
Set-Location D:\Hackathons\shaddy\backend
.\.venv\Scripts\Activate.ps1
pytest -q
```

Expected: 1 passed. (The smoke test is happy with 404 — it only confirms the app object loads.)

- [ ] **Step 7: Commit**

```powershell
Set-Location D:\Hackathons\shaddy
git add backend/app backend/tests backend/pyproject.toml
git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: app skeleton with CORS + pytest smoke"
```

---

## Task 3: Device resolver (TDD)

**Files:**
- Create: `backend/app/device.py`
- Create: `backend/tests/test_device.py`

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_device.py`:

```python
import pytest
from app import device


def test_detect_returns_cpu_when_cuda_unavailable(monkeypatch):
    monkeypatch.setattr("torch.cuda.is_available", lambda: False)
    assert device.detect() == "cpu"


def test_detect_returns_cuda_when_cuda_available(monkeypatch):
    monkeypatch.setattr("torch.cuda.is_available", lambda: True)
    assert device.detect() == "cuda"


def test_resolve_auto_picks_detected_device(monkeypatch):
    monkeypatch.setattr("torch.cuda.is_available", lambda: False)
    assert device.resolve("auto") == "cpu"
    monkeypatch.setattr("torch.cuda.is_available", lambda: True)
    assert device.resolve("auto") == "cuda"


def test_resolve_cpu_always_returns_cpu(monkeypatch):
    monkeypatch.setattr("torch.cuda.is_available", lambda: True)
    assert device.resolve("cpu") == "cpu"


def test_resolve_cuda_when_available(monkeypatch):
    monkeypatch.setattr("torch.cuda.is_available", lambda: True)
    assert device.resolve("cuda") == "cuda"


def test_resolve_cuda_when_unavailable_raises(monkeypatch):
    monkeypatch.setattr("torch.cuda.is_available", lambda: False)
    with pytest.raises(device.CudaUnavailable):
        device.resolve("cuda")
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
pytest -q tests/test_device.py
```

Expected: `ModuleNotFoundError: No module named 'app.device'`

- [ ] **Step 3: Implement `backend/app/device.py`**

```python
from typing import Literal

import torch

Device = Literal["cuda", "cpu"]
RequestedDevice = Literal["auto", "cuda", "cpu"]


class CudaUnavailable(Exception):
    """Raised when 'cuda' is explicitly requested but no GPU is present."""


def detect() -> Device:
    return "cuda" if torch.cuda.is_available() else "cpu"


def resolve(requested: RequestedDevice) -> Device:
    if requested == "auto":
        return detect()
    if requested == "cpu":
        return "cpu"
    # requested == "cuda"
    if not torch.cuda.is_available():
        raise CudaUnavailable("cuda requested but unavailable")
    return "cuda"
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
pytest -q tests/test_device.py
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```powershell
Set-Location D:\Hackathons\shaddy
git add backend/app/device.py backend/tests/test_device.py
git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: device resolver (auto/cuda/cpu) with CudaUnavailable"
```

---

## Task 4: Health endpoint (TDD)

**Files:**
- Create: `backend/app/health.py`
- Modify: `backend/app/main.py` (mount the router)
- Create: `backend/tests/test_health.py`

- [ ] **Step 1: Write the failing test**

`backend/tests/test_health.py`:

```python
async def test_health_returns_ok_and_device(client, monkeypatch):
    monkeypatch.setattr("torch.cuda.is_available", lambda: False)
    r = await client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body == {"ok": True, "device": "cpu"}
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
pytest -q tests/test_health.py
```

Expected: FAIL with 404.

- [ ] **Step 3: Implement `backend/app/health.py`**

```python
from fastapi import APIRouter

from app import device

router = APIRouter()


@router.get("/health")
def health():
    return {"ok": True, "device": device.detect()}
```

- [ ] **Step 4: Mount the router in `backend/app/main.py`**

Append to the bottom of `backend/app/main.py`:

```python
from app import health

app.include_router(health.router)
```

- [ ] **Step 5: Run test to verify it passes**

```powershell
pytest -q tests/test_health.py
```

Expected: 1 passed.

- [ ] **Step 6: Smoke-test live**

```powershell
make dev
```

In another terminal:

```powershell
curl http://localhost:8000/health
```

Expected: `{"ok":true,"device":"cpu"}` (or `"cuda"` on a GPU box). Ctrl-C to stop `make dev`.

- [ ] **Step 7: Commit**

```powershell
Set-Location D:\Hackathons\shaddy
git add backend/app/health.py backend/app/main.py backend/tests/test_health.py
git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: GET /health echoes detected device"
```

---

## Task 5: Pydantic schemas

**Files:**
- Create: `backend/app/schemas.py`
- Create: `backend/tests/test_schemas.py`

- [ ] **Step 1: Write the failing schema tests**

`backend/tests/test_schemas.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify failure**

```powershell
pytest -q tests/test_schemas.py
```

Expected: `ModuleNotFoundError`.

- [ ] **Step 3: Implement `backend/app/schemas.py`**

```python
from typing import Literal, Union

from pydantic import BaseModel, Field

TemplateId = Literal["plasma", "voronoi-cells", "gradient-noise"]
RequestedDevice = Literal["auto", "cuda", "cpu"]
Device = Literal["cuda", "cpu"]


class OptimizeRequest(BaseModel):
    template_id: TemplateId
    image_base64: str
    device: RequestedDevice = "auto"
    max_steps: int = Field(default=500, ge=1, le=500)
    wall_clock_cap_sec: int = Field(default=30, ge=1, le=30)


class OptimizeAccepted(BaseModel):
    job_id: str
    ws_url: str
    resolved_device: Device


class OptimizeError(BaseModel):
    error: str


# --- WebSocket frames ---


class ProgressFrame(BaseModel):
    type: Literal["progress"]
    step: int
    total: int
    loss: float
    preview_b64: str  # data:image/jpeg;base64,...


class DoneFrame(BaseModel):
    type: Literal["done"]
    final_params: dict[str, float | list[float]]
    glsl: str
    loss: float


class ErrorFrame(BaseModel):
    type: Literal["error"]
    message: str


OptimizeFrame = Union[ProgressFrame, DoneFrame, ErrorFrame]
```

- [ ] **Step 4: Run tests to verify pass**

```powershell
pytest -q tests/test_schemas.py
```

Expected: 9 passed.

- [ ] **Step 5: Commit**

```powershell
Set-Location D:\Hackathons\shaddy
git add backend/app/schemas.py backend/tests/test_schemas.py
git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: Pydantic schemas for OptimizeRequest + frame union"
```

---

## Task 6: Template assets + loader (TDD)

**Files:**
- Create: `backend/templates/plasma.glsl`
- Create: `backend/templates/voronoi-cells.glsl`
- Create: `backend/templates/gradient-noise.glsl`
- Create: `backend/templates/defaults.json`
- Create: `backend/app/templates.py`
- Create: `backend/tests/test_templates.py`

- [ ] **Step 1: Write the GLSL placeholder for plasma**

`backend/templates/plasma.glsl`:

```glsl
#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float v = sin(uv.x * 10.0 + u_time) + sin(uv.y * 10.0 + u_time * 0.7);
    fragColor = vec4(0.5 + 0.5 * sin(v), 0.5 + 0.5 * cos(v), 0.5, 1.0);
}
```

- [ ] **Step 2: Write the GLSL placeholder for voronoi-cells**

`backend/templates/voronoi-cells.glsl`:

```glsl
#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

out vec4 fragColor;

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution * 8.0;
    vec2 i = floor(uv);
    vec2 f = fract(uv);
    float d = 1.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 g = vec2(float(x), float(y));
            vec2 p = g + hash21(i + g) * vec2(1.0);
            d = min(d, length(g + p - f));
        }
    }
    fragColor = vec4(vec3(d), 1.0);
}
```

- [ ] **Step 3: Write the GLSL placeholder for gradient-noise**

`backend/templates/gradient-noise.glsl`:

```glsl
#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

out vec4 fragColor;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution * 4.0;
    float v = noise(uv + u_time * 0.2);
    fragColor = vec4(vec3(v), 1.0);
}
```

- [ ] **Step 4: Write `backend/templates/defaults.json`**

```json
{
  "plasma": {
    "freq_x": 10.0,
    "freq_y": 10.0,
    "phase": 0.0,
    "color_a": [0.5, 0.5, 0.5],
    "color_b": [0.5, 0.5, 0.5],
    "time_scale": 1.0
  },
  "voronoi-cells": {
    "cells": 8.0,
    "speed": 0.5
  },
  "gradient-noise": {
    "scale": 4.0,
    "speed": 0.2
  }
}
```

- [ ] **Step 5: Write the failing loader tests**

`backend/tests/test_templates.py`:

```python
import pytest

from app import templates


def test_template_ids_are_three():
    assert templates.TEMPLATE_IDS == ("plasma", "voronoi-cells", "gradient-noise")


def test_defaults_loads_known_template():
    d = templates.defaults("plasma")
    assert "freq_x" in d
    assert d["freq_x"] == 10.0


def test_defaults_unknown_template_raises_key_error():
    with pytest.raises(KeyError):
        templates.defaults("nope")


def test_glsl_loads_known_template():
    src = templates.glsl("plasma")
    assert "void main" in src
    assert "#version" in src


def test_glsl_unknown_template_raises_key_error():
    with pytest.raises(KeyError):
        templates.glsl("nope")
```

- [ ] **Step 6: Run tests to verify failure**

```powershell
pytest -q tests/test_templates.py
```

Expected: `ModuleNotFoundError`.

- [ ] **Step 7: Implement `backend/app/templates.py`**

```python
import json
from functools import lru_cache
from pathlib import Path

TEMPLATE_IDS: tuple[str, ...] = ("plasma", "voronoi-cells", "gradient-noise")

_HERE = Path(__file__).resolve().parent
_ROOT = _HERE.parent
_TEMPLATES_DIR = _ROOT / "templates"


@lru_cache(maxsize=1)
def _all_defaults() -> dict[str, dict[str, float | list[float]]]:
    with (_TEMPLATES_DIR / "defaults.json").open() as f:
        return json.load(f)


def defaults(template_id: str) -> dict[str, float | list[float]]:
    if template_id not in TEMPLATE_IDS:
        raise KeyError(template_id)
    return _all_defaults()[template_id]


@lru_cache(maxsize=8)
def glsl(template_id: str) -> str:
    if template_id not in TEMPLATE_IDS:
        raise KeyError(template_id)
    return (_TEMPLATES_DIR / f"{template_id}.glsl").read_text(encoding="utf-8")
```

- [ ] **Step 8: Run tests to verify pass**

```powershell
pytest -q tests/test_templates.py
```

Expected: 5 passed.

- [ ] **Step 9: Commit**

```powershell
Set-Location D:\Hackathons\shaddy
git add backend/templates backend/app/templates.py backend/tests/test_templates.py
git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: template assets + loader (3 placeholder GLSL + defaults.json)"
```

---

## Task 7: JobRegistry (TDD)

**Files:**
- Create: `backend/app/jobs.py`
- Create: `backend/tests/test_jobs.py`

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_jobs.py`:

```python
import asyncio
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
```

- [ ] **Step 2: Run tests to verify failure**

```powershell
pytest -q tests/test_jobs.py
```

Expected: `ModuleNotFoundError`.

- [ ] **Step 3: Implement `backend/app/jobs.py`**

```python
import asyncio
from dataclasses import dataclass, field
from typing import Literal, Optional

from app.schemas import Device, TemplateId


class SlotBusy(Exception):
    """Raised when acquire() is called while another job occupies the slot."""


@dataclass
class Job:
    job_id: str
    template_id: TemplateId
    image_bytes: bytes
    resolved_device: Device
    max_steps: int
    wall_clock_cap_sec: int
    created_at: float
    gc_task: Optional[asyncio.Task] = field(default=None, compare=False)
    ws_attached: bool = field(default=False)


class JobRegistry:
    """Serial slot. At most one job exists at a time."""

    def __init__(self) -> None:
        self._slot: Optional[Job] = None
        self._lock = asyncio.Lock()

    async def acquire(self, job: Job) -> None:
        async with self._lock:
            if self._slot is not None:
                raise SlotBusy(self._slot.job_id)
            self._slot = job

    async def release(self) -> None:
        async with self._lock:
            self._slot = None

    def current(self) -> Optional[Job]:
        return self._slot

    def get(self, job_id: str) -> Optional[Job]:
        if self._slot is not None and self._slot.job_id == job_id:
            return self._slot
        return None
```

- [ ] **Step 4: Run tests to verify pass**

```powershell
pytest -q tests/test_jobs.py
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```powershell
Set-Location D:\Hackathons\shaddy
git add backend/app/jobs.py backend/tests/test_jobs.py
git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: JobRegistry single-slot serial registry"
```

---

## Task 8: POST /optimize handler (TDD)

**Files:**
- Create: `backend/app/optimize.py` (POST handler only; WS comes in Task 9)
- Modify: `backend/app/main.py` (mount the router + create the shared registry)
- Create: `backend/tests/test_optimize_post.py`
- Create: `backend/tests/_helpers.py` (small helper for building base64 PNGs)

- [ ] **Step 1: Write the test helper**

`backend/tests/_helpers.py`:

```python
import base64
import io

from PIL import Image


def png_data_url(size_px: int = 32, fill: tuple[int, int, int] = (128, 64, 200)) -> str:
    """Return a data URL for a solid-color PNG of the given size."""
    img = Image.new("RGB", (size_px, size_px), fill)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"


def oversized_data_url() -> str:
    """A data URL that is >1MB after base64 decode."""
    payload = b"\x00" * (1_100_000)
    b64 = base64.b64encode(payload).decode("ascii")
    return f"data:application/octet-stream;base64,{b64}"
```

- [ ] **Step 2: Write the failing tests**

`backend/tests/test_optimize_post.py`:

```python
import asyncio
import pytest

from tests._helpers import oversized_data_url, png_data_url


@pytest.fixture(autouse=True)
def _reset_registry():
    """Each test gets a clean serial slot."""
    from app.main import registry
    # Synchronous reset is fine: tests own the loop.
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
```

- [ ] **Step 3: Run tests to verify failure**

```powershell
pytest -q tests/test_optimize_post.py
```

Expected: failures — `app.main.registry` doesn't exist, `/optimize` route 404.

- [ ] **Step 4: Implement `backend/app/optimize.py`**

```python
import asyncio
import base64
import io
import re
import time
import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

from app import device, templates
from app.jobs import Job, JobRegistry, SlotBusy
from app.schemas import OptimizeAccepted, OptimizeError, OptimizeRequest

if TYPE_CHECKING:
    pass

router = APIRouter()

UNCLAIMED_TTL_SEC: float = 10.0
MAX_IMAGE_BYTES: int = 1_000_000  # 1 MB

_DATA_URL_RE = re.compile(r"^data:[^;]+;base64,(.+)$", re.DOTALL)


def _decode_image_b64(b64: str) -> bytes:
    """Strip optional data-URL prefix and base64-decode. Raises ValueError on garbage."""
    m = _DATA_URL_RE.match(b64)
    payload = m.group(1) if m else b64
    try:
        return base64.b64decode(payload, validate=False)
    except Exception as exc:  # pragma: no cover - base64 is permissive
        raise ValueError("invalid base64") from exc


def _err(message: str, code: int) -> JSONResponse:
    return JSONResponse(OptimizeError(error=message).model_dump(), status_code=code)


async def _gc_unclaimed(registry: JobRegistry, job_id: str, ttl: float) -> None:
    try:
        await asyncio.sleep(ttl)
    except asyncio.CancelledError:
        return
    current = registry.current()
    if current is not None and current.job_id == job_id and not current.ws_attached:
        await registry.release()


@router.post("/optimize", status_code=status.HTTP_202_ACCEPTED)
async def post_optimize(req: OptimizeRequest, request: Request):
    # 1. Decode image and enforce size cap.
    try:
        image_bytes = _decode_image_b64(req.image_base64)
    except ValueError:
        return _err("invalid base64", 400)
    if len(image_bytes) > MAX_IMAGE_BYTES:
        return _err("image exceeds 1MB", 400)

    # 2. Confirm it's a real image PIL can parse.
    try:
        Image.open(io.BytesIO(image_bytes)).verify()
    except (UnidentifiedImageError, Exception):
        return _err("unsupported image format", 400)

    # 3. Resolve device.
    try:
        resolved = device.resolve(req.device)
    except device.CudaUnavailable:
        return _err("cuda requested but unavailable", 400)

    # 4. Allocate job and try to occupy the slot.
    registry: JobRegistry = request.app.state.registry
    job = Job(
        job_id=uuid.uuid4().hex,
        template_id=req.template_id,
        image_bytes=image_bytes,
        resolved_device=resolved,
        max_steps=req.max_steps,
        wall_clock_cap_sec=req.wall_clock_cap_sec,
        created_at=time.monotonic(),
    )
    try:
        await registry.acquire(job)
    except SlotBusy:
        return _err("another job in progress", 503)

    # 5. Schedule TTL gc and stash the task on the job.
    job.gc_task = asyncio.create_task(_gc_unclaimed(registry, job.job_id, UNCLAIMED_TTL_SEC))

    return OptimizeAccepted(
        job_id=job.job_id,
        ws_url=f"/optimize/stream/{job.job_id}",
        resolved_device=resolved,
    )
```

- [ ] **Step 5: Wire the router and shared registry into `backend/app/main.py`**

Replace the contents of `backend/app/main.py` with:

```python
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import health, optimize
from app.jobs import JobRegistry

app = FastAPI(title="Shaddy backend", version="0.1.0")

# Shared serial slot. Lives on app.state so tests can reset it via the fixture.
app.state.registry = JobRegistry()
# Also expose at module level for the test fixture's convenience.
registry: JobRegistry = app.state.registry

_default_origins = ["http://localhost:5173"]
_prod_origin = os.environ.get("SHADDY_FRONTEND_ORIGIN")
if _prod_origin:
    _default_origins.append(_prod_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins,
    allow_origin_regex=r"^(http://[^/]+:5173|https://[^/]+\.trycloudflare\.com)$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(optimize.router)
```

- [ ] **Step 6: Run tests to verify pass**

```powershell
pytest -q tests/test_optimize_post.py
```

Expected: 7 passed.

- [ ] **Step 7: Re-run the full suite to confirm nothing else broke**

```powershell
pytest -q
```

Expected: all green.

- [ ] **Step 8: Commit**

```powershell
Set-Location D:\Hackathons\shaddy
git add backend/app/optimize.py backend/app/main.py backend/tests/test_optimize_post.py backend/tests/_helpers.py
git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: POST /optimize with validation, device resolve, slot acquire, TTL gc"
```

---

## Task 9: WS /optimize/stream/{id} handler (TDD)

**Files:**
- Modify: `backend/app/optimize.py` (add the WS route)
- Create: `backend/tests/test_optimize_ws.py`

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_optimize_ws.py`:

```python
import asyncio
import json
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import DoneFrame
from tests._helpers import png_data_url


@pytest.fixture(autouse=True)
def _reset_registry():
    from app.main import registry
    registry._slot = None
    yield
    registry._slot = None


@pytest.fixture(autouse=True)
def _force_cpu(monkeypatch):
    monkeypatch.setattr("torch.cuda.is_available", lambda: False)


def test_ws_sends_one_done_frame_with_template_glsl(monkeypatch):
    """End-to-end stub: POST then WS receives a single DoneFrame and closes."""
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
    assert "void main" in frame.glsl
    assert "freq_x" in frame.final_params


def test_ws_unknown_job_id_is_rejected(monkeypatch):
    sync_client = TestClient(app)
    from starlette.websockets import WebSocketDisconnect
    with pytest.raises(WebSocketDisconnect):
        with sync_client.websocket_connect("/optimize/stream/does-not-exist") as ws:
            ws.receive_text()


def test_ws_releases_slot_on_close(monkeypatch):
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
```

> The WS tests use `TestClient` (sync) because httpx's AsyncClient doesn't speak WebSockets. Different fixture style is intentional and fine.

- [ ] **Step 2: Run tests to verify failure**

```powershell
pytest -q tests/test_optimize_ws.py
```

Expected: failures — no WS route registered.

- [ ] **Step 3: Append the WS handler to `backend/app/optimize.py`**

First, update the top-of-file imports in `backend/app/optimize.py`:
- Add `WebSocket, WebSocketDisconnect` to the existing `from fastapi import ...` line.
- Add `DoneFrame` to the existing `from app.schemas import ...` line.

(`templates` is already imported from Task 8.)

Then append at the bottom of `backend/app/optimize.py`:

```python
@router.websocket("/optimize/stream/{job_id}")
async def ws_optimize_stream(ws: WebSocket, job_id: str):
    registry: JobRegistry = ws.app.state.registry
    job = registry.get(job_id)
    if job is None:
        # 1008 = policy violation. Matches spec §6.
        await ws.close(code=1008)
        return

    # We have a real job. Cancel the TTL gc if it's still pending.
    if job.gc_task is not None and not job.gc_task.done():
        job.gc_task.cancel()
    job.ws_attached = True

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
    except WebSocketDisconnect:
        # Client vanished mid-frame; nothing to do.
        pass
    finally:
        await registry.release()
```

- [ ] **Step 4: Run tests to verify pass**

```powershell
pytest -q tests/test_optimize_ws.py
```

Expected: 3 passed.

- [ ] **Step 5: Run the full suite**

```powershell
pytest -q
```

Expected: all green. Total roughly 30+ tests.

- [ ] **Step 6: Manual smoke (optional but recommended)**

```powershell
make dev
```

In another terminal:

```powershell
$body = @{
    template_id = "plasma"
    image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAeImBZsAAAAASUVORK5CYII="
} | ConvertTo-Json
$r = Invoke-RestMethod -Method Post -Uri http://localhost:8000/optimize -ContentType "application/json" -Body $body
$r
```

Expected: 202 response with `job_id`, `ws_url`, `resolved_device`. (For full WS round-trip use a wscat or browser client.)

- [ ] **Step 7: Commit**

```powershell
Set-Location D:\Hackathons\shaddy
git add backend/app/optimize.py backend/tests/test_optimize_ws.py
git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "backend: WS /optimize/stream/{id} sends stub DoneFrame and releases slot"
```

---

## Task 10: openapi.yaml + shared TS types

**Files:**
- Create: `backend/openapi.yaml`
- Create: `web/src/shared/backend-types.ts`

- [ ] **Step 1: Write `backend/openapi.yaml`**

```yaml
openapi: 3.1.0
info:
  title: Shaddy backend
  version: 0.1.0
  description: |
    Photo->shader optimization service. Source-of-truth schema for the
    request/response and WebSocket frame format. Mirrored by:
      - backend/app/schemas.py        (Python, Pydantic)
      - web/src/shared/backend-types.ts (TypeScript)
    Any change here MUST land in the same PR as both mirrors.

paths:
  /health:
    get:
      operationId: getHealth
      responses:
        "200":
          description: liveness probe
          content:
            application/json:
              schema:
                type: object
                required: [ok, device]
                properties:
                  ok: { type: boolean }
                  device:
                    type: string
                    enum: [cuda, cpu]

  /optimize:
    post:
      operationId: postOptimize
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/OptimizeRequest" }
      responses:
        "202":
          description: job accepted
          content:
            application/json:
              schema: { $ref: "#/components/schemas/OptimizeAccepted" }
        "400":
          description: bad request (oversized image, cuda unavailable, etc.)
          content:
            application/json:
              schema: { $ref: "#/components/schemas/OptimizeError" }
        "422":
          description: validation error
        "503":
          description: another job in progress
          content:
            application/json:
              schema: { $ref: "#/components/schemas/OptimizeError" }

  /optimize/stream/{job_id}:
    get:
      operationId: wsOptimizeStream
      summary: WebSocket — streams OptimizeFrame messages until close.
      description: |
        Although this is documented as a GET for OpenAPI tooling, the actual
        protocol is a WebSocket upgrade. Server messages are JSON-encoded
        OptimizeFrame objects (tagged union by `type`). Server closes after
        sending a `done` or `error` frame, or with code 1008 if job_id is
        unknown.
      parameters:
        - in: path
          name: job_id
          required: true
          schema: { type: string }
      responses:
        "101":
          description: Switching protocols (WebSocket upgrade)

components:
  schemas:
    OptimizeRequest:
      type: object
      required: [template_id, image_base64]
      properties:
        template_id:
          type: string
          enum: [plasma, voronoi-cells, gradient-noise]
        image_base64:
          type: string
          description: PNG/JPEG/WebP, base64 or data-URL, <= 1MB decoded.
        device:
          type: string
          enum: [auto, cuda, cpu]
          default: auto
        max_steps:
          type: integer
          minimum: 1
          maximum: 500
          default: 500
        wall_clock_cap_sec:
          type: integer
          minimum: 1
          maximum: 30
          default: 30

    OptimizeAccepted:
      type: object
      required: [job_id, ws_url, resolved_device]
      properties:
        job_id: { type: string }
        ws_url: { type: string }
        resolved_device:
          type: string
          enum: [cuda, cpu]

    OptimizeError:
      type: object
      required: [error]
      properties:
        error: { type: string }

    ProgressFrame:
      type: object
      required: [type, step, total, loss, preview_b64]
      properties:
        type: { type: string, enum: [progress] }
        step: { type: integer }
        total: { type: integer }
        loss: { type: number }
        preview_b64:
          type: string
          description: data:image/jpeg;base64,... (256x256 JPEG q85)

    DoneFrame:
      type: object
      required: [type, final_params, glsl, loss]
      properties:
        type: { type: string, enum: [done] }
        final_params:
          type: object
          additionalProperties:
            oneOf:
              - { type: number }
              - { type: array, items: { type: number } }
        glsl: { type: string }
        loss: { type: number }

    ErrorFrame:
      type: object
      required: [type, message]
      properties:
        type: { type: string, enum: [error] }
        message: { type: string }

    OptimizeFrame:
      oneOf:
        - $ref: "#/components/schemas/ProgressFrame"
        - $ref: "#/components/schemas/DoneFrame"
        - $ref: "#/components/schemas/ErrorFrame"
      discriminator:
        propertyName: type
```

- [ ] **Step 2: Write `web/src/shared/backend-types.ts`**

```ts
// Hand-mirrored from backend/openapi.yaml AND backend/app/schemas.py.
// Per CONTRACTS.md §3: any change to one of these three files MUST land in
// the same PR as the other two, with both owners' review.

export type TemplateId = 'plasma' | 'voronoi-cells' | 'gradient-noise';
export type Device = 'cuda' | 'cpu';
export type RequestedDevice = 'auto' | 'cuda' | 'cpu';

export interface OptimizeRequest {
  template_id: TemplateId;
  image_base64: string;             // PNG/JPEG/WebP, base64 or data-URL, <=1MB decoded
  device?: RequestedDevice;         // default 'auto'
  max_steps?: number;               // 1..500, default 500
  wall_clock_cap_sec?: number;      // 1..30, default 30
}

export interface OptimizeAccepted {
  job_id: string;
  ws_url: string;                   // relative, e.g. "/optimize/stream/<id>"
  resolved_device: Device;
}

export interface OptimizeError {
  error: string;
}

// --- WebSocket frame union (tagged by `type`) ---

export interface ProgressFrame {
  type: 'progress';
  step: number;
  total: number;
  loss: number;
  preview_b64: string;              // data:image/jpeg;base64,... (256x256 JPEG q85)
}

export interface DoneFrame {
  type: 'done';
  final_params: Record<string, number | number[]>;
  glsl: string;
  loss: number;
}

export interface ErrorFrame {
  type: 'error';
  message: string;
}

export type OptimizeFrame = ProgressFrame | DoneFrame | ErrorFrame;
```

- [ ] **Step 3: Commit**

```powershell
Set-Location D:\Hackathons\shaddy
git add backend/openapi.yaml web/src/shared/backend-types.ts
git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "contract: hand-write openapi.yaml + shared TS types (mirrors §3)"
```

---

## Task 11: Backend README updates

**Files:**
- Modify: `backend/README.md`

- [ ] **Step 1: Append "Local development" + "GPU setup" + "Phone testing" sections**

Append to `backend/README.md`:

```markdown
## Local development

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
make dev   # http://0.0.0.0:8000
```

### GPU setup (optional)

If you have a CUDA GPU, swap to the GPU torch wheel:

```powershell
pip install -r requirements-gpu.txt
```

The dev server detects automatically via `device.detect()`; `GET /health` returns the chosen device.

### Phone testing

To hit `make dev` from a phone on the same wifi:

1. `make dev` already binds to `0.0.0.0:8000`, so it's reachable at `http://<your-LAN-IP>:8000`.
2. Frontend (`web/`) needs to run with `npm run dev -- --host` so the phone can load it.
3. For features that need HTTPS (camera capture on iOS Safari), use a cloudflared quick tunnel:
   ```powershell
   cloudflared tunnel --url http://localhost:5173    # for the frontend
   cloudflared tunnel --url http://localhost:8000    # for the backend, if needed
   ```
   Both `*.trycloudflare.com` and LAN `*:5173` origins are already in the CORS allowlist.

## Running tests

```powershell
make test
```

## What this skeleton does

- `POST /optimize` validates the request, resolves the device, allocates a `job_id`, parks the job behind a 10-second TTL.
- `WS /optimize/stream/{job_id}` sends one stub `DoneFrame` with the template's default parameters + unmodified template GLSL, then closes.

Sub-project B replaces the WS handler's stub with real PyTorch optimization. Wire format stays identical.
```

- [ ] **Step 2: Commit**

```powershell
Set-Location D:\Hackathons\shaddy
git add backend/README.md
git -c user.email=saracensaray@gmail.com -c user.name=zajalist commit -m "docs(backend): README sections for dev, GPU, phone testing"
```

---

## Task 12: CI verification + open PR

**Files:** none (just push + open PR)

- [ ] **Step 1: Push the branch**

```powershell
Set-Location D:\Hackathons\shaddy
git push -u origin backend/skeleton
```

- [ ] **Step 2: Watch CI go green**

```powershell
gh run watch --repo zajalist/shaddy
```

Expected: backend job goes green. The web job will be a near-no-op (no `package.json` in `web/` yet — the CI step short-circuits with "no lockfile yet — skipping").

If the backend job fails, fix the underlying issue, add another commit, push, re-watch. Do not skip hooks.

- [ ] **Step 3: Open the PR**

```powershell
gh pr create --repo zajalist/shaddy --base main --head backend/skeleton --title "backend(skeleton): FastAPI + POST /optimize + WS /optimize/stream/{id} (stub DoneFrame)" --body @"
Closes #2, closes #24, closes #25, closes #26.

## What this is

Sub-project A from the design plan: the backend skeleton + contract surface, with a stub WebSocket that returns one DoneFrame containing template defaults + unmodified GLSL. Lets UX integrate end-to-end now; sub-project B replaces the stub with real PyTorch optimization.

Spec: docs/superpowers/specs/2026-05-23-backend-skeleton-design.md
Plan: docs/superpowers/plans/2026-05-23-backend-skeleton.md

## Acceptance

- `make dev` serves /health.
- `POST /optimize` -> 202 with `{job_id, ws_url, resolved_device}`.
- `WS /optimize/stream/{id}` -> one DoneFrame, close.
- Subsequent POSTs while a job exists return 503.
- POSTs that never WS-attach within 10s evaporate.
- CORS allows localhost, LAN, *.trycloudflare.com.

## Tests

30+ pytest cases covering validation, device resolution, slot acquire/release, TTL gc, WS happy path, WS unknown job rejection.

## Contract changes

- preview_b64 is now JPEG q85 (was PNG) - already merged to main in commit bdda6ca.
- POST /optimize body adds optional `device` field; response adds `resolved_device` - already merged to main in commit 1aa2c1d.

This PR adds:
- backend/openapi.yaml (source of truth)
- web/src/shared/backend-types.ts (TS mirror)
- backend/app/schemas.py (Pydantic mirror)
"@
```

- [ ] **Step 4: Mark all 4 issues as in-PR**

```powershell
gh issue comment 2 --repo zajalist/shaddy --body "Open in PR backend/skeleton."
gh issue comment 24 --repo zajalist/shaddy --body "Open in PR backend/skeleton."
gh issue comment 25 --repo zajalist/shaddy --body "Open in PR backend/skeleton."
gh issue comment 26 --repo zajalist/shaddy --body "Open in PR backend/skeleton."
```

(GitHub will auto-close them when the PR merges thanks to the `Closes #N` footer.)

---

## Done criteria

- [ ] All 12 tasks above checked off.
- [ ] Every commit message references "backend" or "docs(backend)" or "contract".
- [ ] CI is green on `backend/skeleton`.
- [ ] PR is open at https://github.com/zajalist/shaddy/pulls and assigned to zajalist for self-review.
- [ ] `curl http://localhost:8000/health` returns `{"ok":true,"device":"cpu"}` on a fresh checkout + venv + `make dev`.
- [ ] No `TODO`, `XXX`, or `pass  # stub` in any file under `backend/app/`.
