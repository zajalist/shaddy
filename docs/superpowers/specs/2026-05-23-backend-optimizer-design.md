# Backend Optimization Core — Design

> Sub-project B. Covers issues [#27](https://github.com/zajalist/shaddy/issues/27), [#30](https://github.com/zajalist/shaddy/issues/30), [#32](https://github.com/zajalist/shaddy/issues/32), [#33](https://github.com/zajalist/shaddy/issues/33). Branch: `backend/optimizer`. Single PR back to `main`. Builds on sub-project A.

## 1. Goal

Replace the stub `DoneFrame` in `WS /optimize/stream/{id}` with a **real PyTorch optimization loop** that takes the user's image + template id, runs Adam over a parameterized differentiable shader for up to 500 steps (200 on CPU), streams progress frames every 25 steps, and returns a `DoneFrame` whose `glsl` field is the template with the **optimized values substituted as numeric literals** — so the user can immediately drag-to-scrub on the optimized result.

After this sub-project ships, the hero demo works end-to-end: photo in → shader out → tweak in the editor.

## 2. Scope

**In scope:**
- One PyTorch template implementation: **plasma** (#27). Voronoi + gradient-noise are sub-project C.
- LPIPS + MSE loss blend + Adam loop (#30).
- GLSL filler: literal-substitute optimized params into template source (#32).
- CPU fallback at 64×64 (≤ 200 steps), wall-clock cap at 30s, `mock_server.py`, Modal deploy spec (#33).
- Refactor the WS handler from sub-project A to consume an async-generator optimizer.
- Replace the existing `backend/templates/plasma.glsl` placeholder with a **parameterized template** carrying `/*PARAM:name*/` tokens.

**Explicitly out of scope (sub-project C and beyond):**
- Voronoi + gradient-noise PyTorch implementations (#28, #29).
- 3 parallel random inits (#31).
- Any UX-side integration (sub-project G).

## 3. Architecture

```
backend/
├── app/
│   ├── optimize.py          # MODIFIED: WS handler swaps stub for run_optimization()
│   ├── ...
├── optim/                   # NEW package — the actual optimizer
│   ├── __init__.py
│   ├── runner.py            # run_optimization(job) async generator
│   ├── loss.py              # lpips + mse blend
│   ├── image.py             # decode → tensor, encode tensor → jpeg-base64
│   └── glsl_fill.py         # literal substitution into template strings
├── templates/
│   ├── plasma.glsl          # MODIFIED: now parameterized with /*PARAM:name*/ tokens
│   ├── plasma.py            # NEW: PyTorch mirror of plasma.glsl
│   ├── ...
├── scripts/
│   └── mock_server.py       # NEW: pre-recorded frame replay server
├── deploy/
│   └── modal_app.py         # NEW: Modal deployment definition
└── tests/
    ├── test_glsl_fill.py    # NEW
    ├── test_plasma_template.py  # NEW
    ├── test_loss.py         # NEW
    ├── test_runner.py       # NEW
    ├── test_optimize_ws.py  # MODIFIED: expects progress frames now
    └── ...
```

## 4. Components

### 4.1 `templates/plasma.glsl` — parameterized form

The placeholder from sub-project A is replaced with a template carrying substitution tokens. The token format is `/*PARAM:name*/` placed where a numeric literal or vec literal will be baked in:

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

After substitution with default params, every token becomes a real GLSL literal:

```glsl
float t = u_time * 1.0;
float v = sin(uv.x * 10.0 + t) + sin(uv.y * 10.0 + t + 0.0);
vec3 c = mix(vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), 0.5 + 0.5 * sin(v));
```

The `/*PARAM:*/` form is chosen so the template-with-tokens is still **legal GLSL syntactically a block comment**, just nonsensical numerically — i.e. the renderer won't choke if it accidentally tries to compile it.

`defaults.json` already declares the parameter values; no change needed there.

### 4.2 `templates/plasma.py` — differentiable mirror

```python
def render(params: dict[str, torch.Tensor], h: int, w: int, t: float = 0.0) -> torch.Tensor:
    """Return an [H, W, 3] tensor in [0, 1]. All inputs are differentiable except h, w, t.

    `params` is a dict with keys matching the GLSL /*PARAM:name*/ tokens:
      - freq_x, freq_y, phase, time_scale: float tensors
      - color_a, color_b: tensors of shape [3]
    """
```

Math MUST match `plasma.glsl` exactly. A pixel-by-pixel comparison test (sub-project G's job) will catch drift. For sub-project B, a smaller sanity check is enough: render at defaults with `t=0`, compute against a hand-computed reference for 3 sample pixels.

### 4.3 `optim/glsl_fill.py` — literal substitution

```python
def fill(template: str, params: dict[str, float | list[float]]) -> str:
    """Replace every /*PARAM:name*/ token in template with the corresponding literal.

    Numeric -> `<value>` (with `.0` enforced so GLSL parses as float).
    list[3] -> `vec3(a, b, c)` (with `.0` enforced).
    Raises KeyError if a token has no matching param.
    Raises ValueError if a param key is unused (silent drops are bugs).
    """
```

Examples:
- `freq_x=8.3` → `8.3`
- `freq_x=8.0` → `8.0` (not `8` — GLSL would error on int-where-float)
- `color_a=[0.9, 0.2, 0.4]` → `vec3(0.9, 0.2, 0.4)`

### 4.4 `optim/loss.py`

```python
class PerceptualLoss:
    def __init__(self, device: str):
        self.lpips = lpips.LPIPS(net="vgg").to(device).eval()
        for p in self.lpips.parameters():
            p.requires_grad_(False)

    def __call__(self, rendered: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        """Both inputs are [H, W, 3] in [0, 1]. Returns scalar loss."""
        a = rendered.permute(2, 0, 1).unsqueeze(0) * 2 - 1   # LPIPS expects [-1, 1] NCHW
        b = target.permute(2, 0, 1).unsqueeze(0) * 2 - 1
        return self.lpips(a, b).mean() + 0.1 * torch.nn.functional.mse_loss(rendered, target)
```

The 0.1 MSE blend prevents pure-LPIPS from drifting into a colour-correct-but-fuzzy local minimum (spec §7).

### 4.5 `optim/image.py`

```python
def decode_to_tensor(image_bytes: bytes, device: str, size: tuple[int, int]) -> torch.Tensor:
    """PIL decode → RGB float tensor [H, W, 3] in [0, 1] on device, resized to size."""

def encode_jpeg_b64(tensor: torch.Tensor, quality: int = 85) -> str:
    """[H, W, 3] in [0, 1] → 'data:image/jpeg;base64,...' at given quality."""
```

### 4.6 `optim/runner.py` — the optimizer (async generator)

```python
async def run_optimization(job: Job) -> AsyncIterator[OptimizeFrame]:
    """Yields ProgressFrame every 25 steps, ends with one DoneFrame.

    Honors job.resolved_device, job.max_steps, job.wall_clock_cap_sec.
    Cancellable via task.cancel() (yields up to the next checkpoint).
    """
```

Inside:
1. Pick target resolution:
   - GPU: 256×256, `max_steps_actual = job.max_steps` (up to 500).
   - CPU: 64×64, `max_steps_actual = min(job.max_steps, 200)`.
2. Decode image to a tensor at target resolution.
3. Initialize params from `templates.defaults(job.template_id)` (single init for sub-project B; parallel-init is sub-project C).
4. Build the optimizer: `torch.optim.Adam(params.values(), lr=0.02)`.
5. Wall-clock start = `time.monotonic()`.
6. For each step `i` in `0..max_steps_actual`:
   - `rendered = plasma.render(params, h, w)`.
   - `loss = perceptual_loss(rendered, target)`.
   - `loss.backward()`, `optimizer.step()`, `optimizer.zero_grad()`.
   - If `i % 25 == 0`: yield `ProgressFrame(type='progress', step=i, total=max_steps_actual, loss=loss.item(), preview_b64=encode_jpeg_b64(rendered.detach()))`. Then `await asyncio.sleep(0)` — yields control to event loop so the WS write isn't blocked.
   - If `time.monotonic() - start > job.wall_clock_cap_sec`: break (return best-so-far).
7. Compute final GLSL via `glsl_fill.fill(plasma_template_source, params_to_json(params))`.
8. Yield one `DoneFrame(type='done', final_params=params_to_json(params), glsl=final_glsl, loss=final_loss.item())`.

Each torch step runs synchronously on the event loop; the `await asyncio.sleep(0)` at progress checkpoints prevents head-of-line blocking for the WS. This is acceptable for a serial-only server — one job at a time, no contention.

### 4.7 Modified `app/optimize.py` — WS handler swap

The stub from sub-project A:

```python
frame = DoneFrame(type='done', final_params=templates.defaults(...), glsl=templates.glsl(...), loss=0.0)
await ws.send_json(frame.model_dump())
await ws.close()
```

becomes:

```python
async for frame in run_optimization(job):
    await ws.send_json(frame.model_dump())
await ws.close()
```

The existing `try/except WebSocketDisconnect / except Exception` wrapping stays (it now also catches anything `run_optimization` raises — same `ErrorFrame` + close 1011 path).

### 4.8 `scripts/mock_server.py`

A standalone FastAPI app that mirrors the contract but doesn't load torch. Useful for UX teammates without a GPU (and for E2E tests).

```python
# Usage: python -m scripts.mock_server
# Listens on http://localhost:8001 (different from real backend's 8000)
```

Routes:
- `GET /health` → `{"ok": true, "device": "mock"}`.
- `POST /optimize` → same validation as real, 202 with job_id, but stores nothing.
- `WS /optimize/stream/{job_id}` → streams 20 hard-coded `ProgressFrame`s (250ms apart) then one `DoneFrame` with a fixed parameter set.

The preview frames in mock_server are pre-computed at module-import time: render the plasma template at 5 evenly-spaced parameter values between defaults and "after-optimization" snapshot, encode as JPEG-base64, ship as constants.

### 4.9 `deploy/modal_app.py` — Modal deployment

```python
import modal

stub = modal.Stub("shaddy-backend")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements("../requirements.txt")
    .pip_install_from_requirements("../requirements-gpu.txt")
    # Pre-warm LPIPS VGG weights so first request isn't 60MB cold start.
    .run_commands('python -c "import lpips; lpips.LPIPS(net=\\"vgg\\")"')
)

@stub.function(image=image, gpu="A10G", timeout=120)
@modal.asgi_app()
def fastapi_app():
    from app.main import app
    return app
```

Deployment is documented but **not part of this sub-project's acceptance criteria** — it requires a Modal account and credentials. The user runs `modal deploy backend/deploy/modal_app.py` when they want to ship it.

## 5. Data flow

```
client                       FastAPI                       optim/runner
  │ POST /optimize  ──────►  │ acquire slot                    │
  │ ◄────── 202              │ schedule TTL gc                 │
  │                          │                                 │
  │ WS connect ───────────►  │ cancel TTL                      │
  │                          │ accept handshake                │
  │                          │ async for frame in              │
  │                          │     run_optimization(job)  ───► │ load image → tensor
  │                          │                                 │ init params, Adam
  │                          │                                 │ step 0..N:
  │                          │                                 │   render, loss, backward, step
  │ ◄── progress (s=0)       │ ◄────── ProgressFrame           │   yield ProgressFrame
  │ ◄── progress (s=25)      │                                 │
  │     ...                  │                                 │   ...
  │ ◄── done                 │ ◄────── DoneFrame               │ fill GLSL with literals
  │                          │ ws.close()                      │
  │                          │ finally: release slot           │
```

## 6. Failure modes (new in B)

| Trigger | Behavior |
|---|---|
| OOM during optim | `ErrorFrame(message="out of memory")`, close 1011. Free state. |
| NaN loss | Same — log + ErrorFrame + close. Don't try to recover. |
| Wall-clock cap hit | Stop loop, send `DoneFrame` with the best result so far. No error frame. |
| Client disconnects mid-stream | Existing `finally: release` triggers. Optim task gets `CancelledError` at next `await`. Nothing else needed. |
| LPIPS weights download fails (first run, no network) | Image build prebakes the weights — should never happen in deploy. In dev: surface the original exception in the `ErrorFrame`. |

## 7. Testing

### Unit
- **`test_glsl_fill.py`** — round-trip: fill plasma template with defaults, parse-check (no `/*PARAM:*/` remaining; valid GLSL float syntax). Reject unknown param key; reject missing param.
- **`test_plasma_template.py`** — render plasma at defaults with known inputs → assert 3 sample pixels within 1e-3 of hand-computed reference.
- **`test_loss.py`** — perceptual loss is differentiable: render at random params → backward → assert each param has a non-None `.grad`. Loss of identical images < 0.01.

### Integration
- **`test_runner.py`** — run optimizer for 5 steps (override `max_steps`) on a tiny target; assert: first frame is `ProgressFrame(step=0)`; final frame is `DoneFrame`; `DoneFrame.glsl` is valid GLSL string with no `/*PARAM:*/` remaining; `final_params` keys match defaults keys.
- **`test_optimize_ws.py` (modified)** — POST + WS → assert ≥ 2 progress frames arrive + exactly one done frame + WS closes. Override `max_steps=5` via a test-only mechanism (e.g. an env var the runner reads, set in the test).

### What's NOT tested in B
- Real convergence on real photos — too slow + flaky for CI. Will be smoke-tested manually before the demo.
- Modal deploy — requires Modal account.

## 8. Performance budget

- GPU (A10G or equivalent): 500 steps in ≤ 20 seconds at 256×256.
- CPU: 200 steps in ≤ 30 seconds at 64×64.
- WS frame size: target ≤ 25 KB per progress frame (JPEG q85 at 256×256 ≈ 15 KB typical).
- The optimization loop is sync inside an `async def` — no thread offloading. Acceptable because the server is serial-only (sub-project A: one job at a time). If we add a bounded pool later, the optimizer moves to `asyncio.to_thread`.

## 9. Non-decisions (carried forward)

- 3 random parallel inits (#31) — sub-project C.
- Voronoi + gradient-noise PyTorch templates (#28, #29) — sub-project C.
- All UX wiring (Settings device toggle, photo upload, progress modal, error UX) — sub-project G.
- Real Modal deployment with credentials — operational, user-driven.

## 10. Open questions

None at design time. Implementation may surface tactical questions (LPIPS net='vgg' vs 'alex' tradeoff, etc.) — those go in the plan, not here.
