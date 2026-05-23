# Backend Stretch Templates + Parallel Inits — Design

> Sub-project C. Covers issues [#28](https://github.com/zajalist/shaddy/issues/28), [#29](https://github.com/zajalist/shaddy/issues/29), [#31](https://github.com/zajalist/shaddy/issues/31). Branch: `backend/templates-c`. Single PR back to `main`. Builds on sub-project B.

## 1. Goal

Add two more diffable templates (voronoi-cells, gradient-noise) and a 3-random-init harness around the optimizer. After this lands, the user can match a photo against any of the three templates, and the result is the best of three independently-initialized chains — mitigating the local-minima problem the spec calls out (§7, §11).

## 2. Scope

**In scope:**
- Parameterize `templates/voronoi-cells.glsl` and `templates/gradient-noise.glsl` with `/*PARAM:*/` tokens.
- Add color params to both so they can target colorful photos (not just grayscale).
- Update `templates/defaults.json` to include the new param keys.
- `templates/voronoi.py` and `templates/gradient_noise.py` — diffable PyTorch mirrors.
- `optim/parallel.py` — runs N chains, streams from the current-best, returns the lowest-final-loss result.
- Thread `n_inits` through the runner (default 3, configurable via test override).
- Tests for each.

**Out of scope:**
- Real convergence quality on photos (manual smoke; not CI).
- Any UX-side change (Settings panel for "n inits" — not in spec).

## 3. Template param schemas

### voronoi-cells

```glsl
// templates/voronoi-cells.glsl (parameterized)
#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
out vec4 fragColor;

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution * /*PARAM:cells*/;
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
    vec3 c = mix(/*PARAM:color_a*/, /*PARAM:color_b*/, d);
    fragColor = vec4(c, 1.0);
}
```

Params: `cells` (float), `color_a` (vec3), `color_b` (vec3).

### gradient-noise

```glsl
// templates/gradient-noise.glsl (parameterized)
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
    vec2 uv = gl_FragCoord.xy / u_resolution * /*PARAM:scale*/;
    float v = noise(uv + u_time * /*PARAM:speed*/);
    vec3 c = mix(/*PARAM:color_a*/, /*PARAM:color_b*/, v);
    fragColor = vec4(c, 1.0);
}
```

Params: `scale` (float), `speed` (float), `color_a` (vec3), `color_b` (vec3).

`defaults.json` gets the color params appended; existing `cells`, `scale`, `speed` keys keep their current values.

## 4. PyTorch mirrors

### voronoi.py — differentiability via soft-min

```python
def render(params, h, w, t=0.0) -> Tensor[H,W,3]:
    # cells = params['cells']
    # uv = grid * cells
    # i = floor(uv); f = fract(uv)
    # For 9 neighbors compute distance length(g + hash(i+g) - f), stack into [H,W,9]
    # Soft-min: -log(sum exp(-k * d)) / k  with k=20.0 (sharper -> closer to hard min)
    # mix(color_a, color_b, soft_min_d)
```

Hard `min` is non-differentiable. Soft-min preserves gradient. With `k=20.0` the soft min is within ~5% of hard min for our distance ranges.

`hash21` uses `sin` + `fract` which are differentiable. The gradient is junk for the hash itself (we don't optimize hash inputs) but flow through `cells`, `color_a`, `color_b` is clean since they don't pass through the hash.

### gradient_noise.py

```python
def render(params, h, w, t=0.0) -> Tensor[H,W,3]:
    # scale = params['scale']; speed = params['speed']
    # uv = grid * scale + t * speed
    # smoothstep: f = f*f*(3-2f)
    # 4-corner hash + bilinear with f
    # mix(color_a, color_b, v)
```

Same hash treatment — differentiable through scale/speed/colors but not through hash inputs (which is fine).

## 5. Parallel inits

```python
# optim/parallel.py

async def run_parallel(job: Job, n_inits: int = 3) -> AsyncIterator[OptimizeFrame]:
    """Run n_inits chains. Stream ProgressFrames from the current-best chain
    (lowest loss right now). Final DoneFrame is from the chain with lowest
    final loss.

    Each chain shares: target image, template, optimizer hyperparams.
    Each chain differs: initial parameter values (perturbed around defaults
    with small random noise: ±10% on floats, ±0.1 on colors).
    """
```

Implementation:
- Create N runners by interleaving N copies of `run_optimization` with seeded different param initializations.
- At each "tick" (every PROGRESS_EVERY_N steps), step each chain once, collect losses, yield a ProgressFrame from the best one.
- On completion, return the DoneFrame from the chain with lowest `last_loss`.

For simplicity in this iteration: **run chains sequentially in a single asyncio task, alternating one step at a time.** Yields control via `await asyncio.sleep(0)` between steps. With N=3 and serial-only server, this is roughly 3x slower per chain than single-init but still well within the 30s cap on GPU (for CPU/64x64 we keep N=1 to avoid blowing the wall clock).

```python
async def run_parallel(job, n_inits=3):
    if job.resolved_device == "cpu":
        # CPU is already slow; don't 3x the wait. Fall back to single init.
        async for frame in run_optimization(job):
            yield frame
        return
    # GPU path: run N chains in lockstep
    chains = [_init_chain(job, seed=i) for i in range(n_inits)]
    ...
```

This keeps CPU testing fast (sub-second per chain) and only adds the parallel-init magic on GPU.

## 6. Modified runner

`optim/runner.py` gets a small refactor:
- Extract `_step(chain) -> loss` and `_emit_progress(chain, step, total) -> ProgressFrame`.
- `run_optimization(job)` becomes a thin wrapper around `_init_chain` + `_step` loop.
- `run_parallel` reuses `_step` + `_emit_progress` across N chains.

The WS handler in `app/optimize.py` switches from `run_optimization` to `run_parallel` — calls become `async for frame in run_parallel(job)`. (`run_optimization` still exists; sub-project G can choose which to use.)

## 7. Testing

### Templates
- `test_voronoi_template.py` — render at defaults: shape, range, colors distinguish when `color_a != color_b`, params are differentiable.
- `test_gradient_noise_template.py` — same shape of tests.

### Parallel
- `test_parallel.py`
  - On CPU: falls through to single-init (count chains by mocking + assert only one was run).
  - On simulated GPU (monkeypatch `device` to bypass the CPU shortcut): asserts N seeds produce N distinct initial param dicts.
  - With max_steps=5 and n_inits=2: full pass returns a DoneFrame and never raises.

### Integration
- `test_optimize_ws.py` already exercises `run_optimization` end-to-end. Update the test to exercise `run_parallel` instead, since the WS handler will switch. With monkeypatched CPU_MAX_STEPS=3 and n_inits=1 (CPU shortcut), the test still passes quickly.

## 8. Failure modes (incremental)

| Trigger | Behavior |
|---|---|
| One chain NaNs out, others fine | Skip the NaN chain at done-time; pick best from remaining. Log a warning. |
| All chains NaN | `ErrorFrame(message="all parallel chains diverged")`, close 1011. |
| n_inits=0 (misconfig) | Raise ValueError immediately, before any optim work. |

## 9. Out of scope (forward)

- Per-chain device placement (multi-GPU). Single-device for now.
- User-tunable n_inits via the API. Hard-coded to 3.
- Animated previews of all chains side-by-side. Spec calls for one stream.

## 10. Open questions

None at design time.
