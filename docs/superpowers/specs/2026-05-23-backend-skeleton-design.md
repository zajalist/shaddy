# Backend Skeleton & Contract Surface — Design

> Sub-project A. Covers issues [#2](https://github.com/zajalist/shaddy/issues/2), [#24](https://github.com/zajalist/shaddy/issues/24), [#25](https://github.com/zajalist/shaddy/issues/25), [#26](https://github.com/zajalist/shaddy/issues/26). Branch: `backend/skeleton`. Single PR back to `main`.

## 1. Goal

Stand up the Python service that the photo→shader feature will run inside. After this sub-project ships, the contract surface is live and a downstream consumer (UX integration) can:

1. POST a photo + template id.
2. Connect a WebSocket.
3. Receive exactly one `done` frame containing the template's default parameters and the unmodified GLSL.
4. Drop that GLSL into the renderer and see it work.

The actual optimization (sub-project B) replaces step 3 with real progress frames + a real `done`, without changing any of the wire format.

## 2. Scope

**In scope (this PR):**
- FastAPI app skeleton with health, CORS, dev Makefile.
- `requirements.txt` (CPU torch) and `requirements-gpu.txt` (CUDA torch).
- `POST /optimize` — full validation, device resolution, job_id allocation, 202 response with `ws_url` and `resolved_device`. 503 when another job is in flight.
- `WS /optimize/stream/{job_id}` — accepts a connection, sends one `done` frame with template defaults + unmodified template GLSL, closes.
- `openapi.yaml` checked in; mirror TS types in `web/src/shared/backend-types.ts`.
- Two minimal test files (pytest + httpx + websockets).
- CI green.

**Explicitly out of scope (sub-project B and beyond):**
- Any real PyTorch optimization, LPIPS loss, Adam loop.
- `progress` frames during the WS lifetime.
- `mock_server.py` (ships with B).
- Parallel inits, GLSL filler with actual final params, Modal deploy config.

## 3. Architecture

```
backend/
├── Makefile                       # make dev → uvicorn on 0.0.0.0:8000
├── requirements.txt               # CPU torch baseline
├── requirements-gpu.txt           # GPU upgrade overlay
├── openapi.yaml                   # source-of-truth schema (hand-written)
├── README.md                      # already scaffolded
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app, CORS, route registration
│   ├── health.py                  # GET /health
│   ├── optimize.py                # POST /optimize, WS /optimize/stream/{id}
│   ├── jobs.py                    # Job, JobRegistry (serial slot)
│   ├── device.py                  # device resolution helper
│   ├── templates.py               # template id whitelist + defaults loader
│   └── schemas.py                 # Pydantic models matching openapi.yaml
├── templates/
│   ├── plasma.glsl                # unmodified GLSL, used by stub done frame
│   ├── voronoi-cells.glsl
│   ├── gradient-noise.glsl
│   └── defaults.json              # { template_id: { param: value } }
└── tests/
    ├── __init__.py
    ├── conftest.py                # httpx AsyncClient fixture, monkeypatch device
    ├── test_optimize_post.py
    └── test_optimize_ws.py
```

Web side adds: `web/src/shared/backend-types.ts` (hand-written, mirrors `openapi.yaml`).

## 4. Components

### 4.1 `app/main.py` — application root
- Constructs the FastAPI app.
- Mounts CORSMiddleware with allowlist: `http://localhost:5173`, regex `http://.*:5173` (LAN), regex `https://.*\.trycloudflare\.com` (tunnel), and an env-driven prod origin (`SHADDY_FRONTEND_ORIGIN`).
- Registers routers from `health.py` and `optimize.py`.

### 4.2 `app/health.py`
- `GET /health` → `{"ok": true, "device": "cuda" | "cpu"}` (calls `device.detect()`).

### 4.3 `app/device.py`
- `detect() -> Literal["cuda", "cpu"]` — `"cuda"` if `torch.cuda.is_available()`, else `"cpu"`.
- `resolve(requested: Literal["auto", "cuda", "cpu"]) -> Literal["cuda", "cpu"]`:
  - `"auto"` → `detect()`
  - `"cuda"` → `"cuda"` if available, else raise `CudaUnavailable`.
  - `"cpu"` → `"cpu"` always.

### 4.4 `app/jobs.py` — single-slot serial registry
The concurrency model is **serial: at most one job exists at a time**.

```python
@dataclass
class Job:
    job_id: str                                    # uuid4 hex
    template_id: Literal["plasma", "voronoi-cells", "gradient-noise"]
    image_bytes: bytes                             # decoded base64, ≤ 1MB
    resolved_device: Literal["cuda", "cpu"]
    max_steps: int
    wall_clock_cap_sec: int
    created_at: float                              # time.monotonic()
    gc_task: asyncio.Task | None = None            # the 10-second TTL canceller
    ws_attached: bool = False                      # set True when WS handshakes

class JobRegistry:
    def __init__(self) -> None:
        self._slot: Job | None = None
        self._lock = asyncio.Lock()

    async def acquire(self, job: Job) -> None:
        """Raise SlotBusy if a job already occupies the slot."""

    async def release(self) -> None:
        """Free the slot (called from WS handler `finally`)."""

    def current(self) -> Job | None: ...

    def get(self, job_id: str) -> Job | None: ...
```

- `acquire` is the only path that fills the slot. POST `/optimize` calls it; if busy, returns 503.
- `release` is the only path that empties the slot. The WS handler's `finally:` block calls it. The 10-second TTL task also calls it if the WS never connects.

### 4.5 `app/templates.py`
- `TEMPLATE_IDS: tuple[str, ...] = ("plasma", "voronoi-cells", "gradient-noise")`.
- `defaults(template_id) -> dict[str, float | list[float]]` — loads from `backend/templates/defaults.json`.
- `glsl(template_id) -> str` — loads the GLSL file content as-is. Sub-project B replaces these literals; sub-project A returns them untouched.

### 4.6 `app/schemas.py` — Pydantic models
Mirrors `openapi.yaml`. Source of truth for both sides:

```python
class OptimizeRequest(BaseModel):
    template_id: Literal["plasma", "voronoi-cells", "gradient-noise"]
    image_base64: str
    device: Literal["auto", "cuda", "cpu"] = "auto"
    max_steps: int = Field(default=500, ge=1, le=500)
    wall_clock_cap_sec: int = Field(default=30, ge=1, le=30)

class OptimizeAccepted(BaseModel):
    job_id: str
    ws_url: str                                   # relative, e.g. "/optimize/stream/<id>"
    resolved_device: Literal["cuda", "cpu"]

class OptimizeError(BaseModel):
    error: str

# OptimizeFrame is a tagged union sent over the WS:
class ProgressFrame(BaseModel):
    type: Literal["progress"]
    step: int
    total: int
    loss: float
    preview_b64: str             # data:image/jpeg;base64,...

class DoneFrame(BaseModel):
    type: Literal["done"]
    final_params: dict[str, float | list[float]]
    glsl: str
    loss: float

class ErrorFrame(BaseModel):
    type: Literal["error"]
    message: str

OptimizeFrame = ProgressFrame | DoneFrame | ErrorFrame
```

### 4.7 `app/optimize.py` — the two endpoints

**`POST /optimize`** (in this order):
1. Validate body against `OptimizeRequest`.
2. Decode `image_base64` (strip optional `data:image/...;base64,` prefix). If the decoded payload is >1MB → **400** `{"error": "image exceeds 1MB"}`.
3. Confirm PIL can open the image (else 400).
4. Resolve device. `CudaUnavailable` → **400** `{"error": "cuda requested but unavailable"}`.
5. Try to `JobRegistry.acquire(...)`. `SlotBusy` → **503** `{"error": "another job in progress"}`.
6. Schedule a 10-second TTL task and store it on `job.gc_task`: if `Job.ws_attached` is still False after 10s, call `JobRegistry.release()` and log the GC.
7. Respond **202** `OptimizeAccepted`.

**`WS /optimize/stream/{job_id}`**:
1. Look up job. Not found → close with code 1008.
2. Mark `ws_attached = True`; cancel `job.gc_task` if it exists.
3. Accept the WebSocket handshake.
4. Build a stub `DoneFrame`:
   - `final_params = templates.defaults(job.template_id)`
   - `glsl = templates.glsl(job.template_id)`
   - `loss = 0.0`
5. `await ws.send_json(done_frame.model_dump())`.
6. `await ws.close()`.
7. `finally: await registry.release()`.

**Why this order matters:**
- TTL exists so a POST that never gets followed by a WS connect doesn't squat the slot forever.
- The `finally:` release is the *only* path that frees the slot once the WS attached, so client disconnects mid-stream (sub-project B will have a long-running optimizer here) also free the slot.

## 5. Data flow (sub-project A end-to-end)

```
client                       FastAPI                       JobRegistry
  │   POST /optimize             │                              │
  │ ───────────────────────────► │                              │
  │                              │ validate, decode, resolve    │
  │                              │ acquire(job) ──────────────► │
  │                              │                              │ slot ← job
  │                              │ schedule gc_task (10s)       │
  │   202 { job_id, ws_url,      │                              │
  │         resolved_device }    │                              │
  │ ◄─────────────────────────── │                              │
  │                              │                              │
  │   WS /optimize/stream/{id}   │                              │
  │ ────────────────────────────►│                              │
  │                              │ cancel gc_task               │
  │                              │ ws_attached=True             │
  │                              │ accept handshake             │
  │   { type:"done",             │                              │
  │     final_params:{...},      │                              │
  │     glsl:"...", loss:0 }     │                              │
  │ ◄─────────────────────────── │                              │
  │   close                      │ release ───────────────────► │ slot ← None
  │ ◄─────────────────────────── │                              │
```

## 6. Failure modes (sub-project A)

| Trigger | Response |
|---|---|
| Body fails Pydantic validation | 422 from FastAPI default |
| Decoded image > 1MB | 400 `{"error":"image exceeds 1MB"}` |
| Decoded bytes not a parseable image | 400 `{"error":"unsupported image format"}` |
| `device:"cuda"` but no GPU | 400 `{"error":"cuda requested but unavailable"}` |
| Another job in flight | 503 `{"error":"another job in progress"}` |
| WS connects with unknown `job_id` | close 1008 (policy violation) |
| WS connects after the 10-second TTL fired | same as above |
| Client disconnects after WS open | `finally:` releases slot; no further frames |
| Server bug while building the done frame | log + ErrorFrame + close |

## 7. Testing

Two pytest modules:

### `tests/test_optimize_post.py`
- 202 on valid input (mock device to "cpu" via fixture).
- 422 on malformed body (e.g., unknown `template_id`).
- 400 on >1MB image.
- 400 on `device:"cuda"` (CUDA monkeypatched to unavailable).
- 503 when a second POST arrives while a job exists.
- After 10 seconds with no WS, the slot is freed (test uses `freezegun` or just `asyncio.sleep` short-circuit).

### `tests/test_optimize_ws.py`
- Full POST → WS-connect → assert single `done` frame → assert WS closed.
- Frame validates against `DoneFrame` Pydantic model.
- `glsl` returned matches `backend/templates/plasma.glsl` byte-for-byte.

### CI
Already wired (`.github/workflows/ci.yml`) — backend job installs `requirements.txt` and runs `pytest -q`. No GPU needed; device resolution falls through to `"cpu"`.

## 8. Type sharing strategy

- `openapi.yaml` is the **human-readable** declaration of the schema.
- `app/schemas.py` is the **executable** declaration on the Python side.
- `web/src/shared/backend-types.ts` is the **executable** declaration on the TS side.

All three are hand-written and live in the same PR for any change. CONTRACTS.md already enforces this for changes to §3. No codegen pipeline in sub-project A — adds 30 min of setup for the 6 types we have. Revisit at >10 endpoints.

## 9. Non-decisions (carried forward to sub-project B)

These will be designed in sub-project B's brainstorm; sub-project A is structured so they slot in without changing the wire format:

- The actual optimizer is an async generator yielding `OptimizeFrame`s. The WS handler iterates it and forwards frames. (Stub today yields exactly one `DoneFrame`.)
- The optimizer is cancellable via `asyncio.Task.cancel()`; the WS handler's `finally:` cancels it on disconnect.
- LPIPS, Adam, downsampling, parallel inits all live behind the generator.

## 10. Open questions

None at design time. The grilling session has resolved every load-bearing question; the writing-plans pass will catch any remaining tactical ones.
