$ErrorActionPreference = 'Stop'
$repo = 'zajalist/shaddy'
$tmp  = Join-Path $env:TEMP 'shaddy-issues'
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

$issues = @(
  # ───────────── Setup (3) ─────────────
  @{
    Title = '[setup] Scaffold Vite + React + TS + Tailwind in web/'
    Assignees = 'AndyHanDev'
    Labels = @('setup','tier:1')
    Body = @'
**Owner:** AndyHanDev (Renderer track needs this first; UX builds on it.)

Stand up the frontend toolchain so every other web/ issue has a place to land.

## Tasks
- [ ] `npm create vite@latest web -- --template react-ts` (already have `web/`, init in place)
- [ ] Add Tailwind + PostCSS, base `index.css`
- [ ] Add Zustand
- [ ] Add CodeMirror 6 deps (lang-cpp or glsl mode) and `@types/wicg-file-system-access` if needed
- [ ] `tsconfig.json` with strict mode
- [ ] Mount `<div id="root">` in `index.html`, `main.tsx` renders a placeholder `<AppShell />`
- [ ] `npm run dev` works, `npm run build` works, `npm run typecheck` works
- [ ] CI passes (already wired in `.github/workflows/ci.yml`)

## Acceptance
- `cd web && npm install && npm run dev` opens a page that says "Shaddy" in a Tailwind heading.
- CI is green on `main`.
'@
  },
  @{
    Title = '[setup] Backend skeleton: FastAPI app + venv + requirements.txt'
    Assignees = 'zajalist'
    Labels = @('setup','tier:1','track:ml-backend')
    Body = @'
**Owner:** zajalist

Stand up the backend so ML work has a place to land. No model yet — just the skeleton.

## Tasks
- [ ] `backend/requirements.txt` with `fastapi`, `uvicorn[standard]`, `websockets`, `torch`, `torchvision`, `lpips`, `pillow`, `numpy`
- [ ] `backend/app/main.py` with `GET /health` returning `{"ok": true}`
- [ ] `backend/Makefile` with `make dev` → `uvicorn app.main:app --reload --port 8000`
- [ ] CORS allows `http://localhost:5173`
- [ ] `backend/README.md` exists (already scaffolded)
- [ ] CI runs `pytest -q` (no tests yet is fine)

## Acceptance
- `make dev` serves `http://localhost:8000/health` → `{"ok": true}`.
- CI green.
'@
  },
  @{
    Title = '[setup] ESLint module-boundary rules (no cross-imports between tracks)'
    Assignees = 'zajalist','AndyHanDev'
    Labels = @('setup','tier:1','contract')
    Body = @'
**Owners:** both

Enforce the dependency direction in `CONTRACTS.md` so isolation doesn't silently rot.

## Rules to enforce
- `web/src/renderer/**` may NOT import from `editor/`, `ux/`, or `integration/`.
- `web/src/editor/**` may NOT import from `renderer/`, `ux/`, or `integration/`.
- `web/src/ux/**` may import from `renderer/`, `editor/`, `shared/`. NOT from `integration/`.
- `web/src/integration/**` may import from anywhere. Nothing may import from `integration/`.
- Anyone importing from `renderer/`, `editor/`, or `ux/` must hit the package root (`index.ts`), not internals.

## Tasks
- [ ] Add `eslint-plugin-import` + `eslint-plugin-boundaries` (or write a small custom rule)
- [ ] Wire into `npm run lint` and CI
- [ ] Add `web/eslint.config.js` with the rules above
- [ ] One test PR that violates a boundary should fail CI

## Acceptance
- A PR that does `import { foo } from "../renderer/gl/internal"` fails CI.
'@
  },

  # ───────────── Renderer (10) — AndyHanDev ─────────────
  @{
    Title = '[renderer][contract] Publish renderer/index.ts skeleton'
    Assignees = 'AndyHanDev'
    Labels = @('track:renderer','tier:1','contract','demo-blocker')
    Body = @'
**Owner:** AndyHanDev
**Contract ref:** `CONTRACTS.md` §1

Publish the public surface so the UX and integration tracks can write against it before the implementation is done.

## Tasks
- [ ] `web/src/renderer/index.ts` exports `RendererAPI`, `CompileResult`, `GLSLError`, `Uniform`, `createRenderer()` exactly per §1.
- [ ] All methods are stubs that throw `not implemented` — but they typecheck.
- [ ] Re-read §1 and PR back any tweaks to the contract you discover are needed; update `CONTRACTS.md` in the same PR.

## Acceptance
- `import { createRenderer } from "@/renderer"` typechecks in another file.
'@
  },
  @{
    Title = '[renderer] WebGL2 context + fullscreen quad'
    Assignees = 'AndyHanDev'
    Labels = @('track:renderer','tier:1','demo-blocker')
    Body = @'
**Owner:** AndyHanDev

Get a canvas drawing a hardcoded fragment shader at 60fps.

## Tasks
- [ ] Create canvas, request `webgl2` context (no fallback to WebGL1).
- [ ] Compile a hardcoded passthrough vertex shader + a debug fragment shader.
- [ ] Render a fullscreen triangle (one triangle, not two — fewer verts) every animation frame.
- [ ] Use `requestAnimationFrame`, not `setInterval`.

## Acceptance
- Mounting renderer to a `<div>` shows a moving color gradient. 60fps on desktop Chrome.
'@
  },
  @{
    Title = '[renderer] Shader compile + hot-swap; keep last-good on failure'
    Assignees = 'AndyHanDev'
    Labels = @('track:renderer','tier:1','demo-blocker')
    Body = @'
**Owner:** AndyHanDev
**Contract:** §1 — `compile(fragmentSource) -> CompileResult`

When `compile()` is called:
- On success, swap the active program. Old program is deleted.
- On failure, return `{ ok: false, errors }`. The canvas continues showing whatever was last successful — *do not blank it*.
- Notify `onCompile` subscribers.

## Tasks
- [ ] `compile` returns synchronous result.
- [ ] Old GL program is deleted on swap to avoid resource leak.
- [ ] Failure leaves the last-good program drawing.
- [ ] Subscribers added via `onCompile` fire on every compile (success or failure).

## Acceptance
- Calling `compile` with broken GLSL returns errors AND the canvas keeps drawing the last good shader.
'@
  },
  @{
    Title = '[renderer] GLSL error parsing → {line, column, message}'
    Assignees = 'AndyHanDev'
    Labels = @('track:renderer','tier:1','contract')
    Body = @'
**Owner:** AndyHanDev
**Contract:** §1 — `GLSLError`

WebGL drivers return error logs in wildly different formats. Normalize them so the editor can underline the right line.

## Tasks
- [ ] Parse `gl.getShaderInfoLog()` for ANGLE/Mesa/Apple drivers.
- [ ] Errors must be in **user source coordinates** (1-based line), not the wrapped/prefixed source you actually send to GL.
  - If you prepend `#version 300 es` + uniform decls, subtract that offset from reported line numbers.
- [ ] Tests with synthetic broken shaders covering: missing semicolon, undefined identifier, wrong vec arity.

## Acceptance
- Given the 12 templates, a single-line break produces a `GLSLError` whose `line` matches the user-visible line.
'@
  },
  @{
    Title = '[renderer] Standard uniforms: u_time, u_resolution, u_mouse'
    Assignees = 'AndyHanDev'
    Labels = @('track:renderer','tier:1','demo-blocker')
    Body = @'
**Owner:** AndyHanDev
**Contract:** §1 standard uniforms

These are set by the renderer every frame — callers do not manage them.

## Tasks
- [ ] `u_time` — seconds since first `mount()`, float.
- [ ] `u_resolution` — vec2, drawing buffer size (NOT CSS size).
- [ ] `u_mouse` — vec2 in `[0,1]`, from pointer + touch events on the mount host.
- [ ] All three are only `uniform`-declared in the user shader if used; otherwise no warning.

## Acceptance
- Template `voronoi` animates via `u_time`. Resizing changes `u_resolution`. Mouse/touch drag updates `u_mouse`.
'@
  },
  @{
    Title = '[renderer] Implement setUniform / resize / snapshot / onCompile / getFps'
    Assignees = 'AndyHanDev'
    Labels = @('track:renderer','tier:1','contract')
    Body = @'
**Owner:** AndyHanDev
**Contract:** §1

Round out the `RendererAPI` surface so UX has everything it needs.

## Tasks
- [ ] `setUniform(name, value | null)` — persists across compiles. `null` clears.
- [ ] `resize(w, h)` — updates drawing buffer, viewport, and `u_resolution`.
- [ ] `snapshot()` — `canvas.toDataURL("image/png")` after a render.
- [ ] `onCompile(cb)` — returns unsubscribe function.
- [ ] `getFps()` — rolling 1-second average. Cheap; called per frame by the debug surface.

## Acceptance
- UX can subscribe to compile events and read FPS without reaching into renderer internals.
'@
  },
  @{
    Title = '[renderer] Template library: 12 starter shaders + manifest'
    Assignees = 'AndyHanDev'
    Labels = @('track:renderer','tier:1','demo-blocker')
    Body = @'
**Owner:** AndyHanDev

Ship 12 starter shaders the user can pick as a starting point. Each is 20–40 lines and produces a recognizable aesthetic.

## Required set
1. plain-circle
2. soft-gradient
3. stripes
4. plasma
5. value-noise field
6. voronoi cells
7. simple raymarch sphere (one, marker for the genre)
8. radial-bands
9. checkerboard
10. ripple
11. polar kaleidoscope
12. simple SDF heart

## Tasks
- [ ] One `.glsl` per template in `web/src/renderer/templates/`.
- [ ] `templates/manifest.ts` exports `{ id, name, thumbnail, source }[]`.
- [ ] Thumbnails generated at build (or first-load) via `snapshot()`.
- [ ] `plasma`, `voronoi-cells`, `gradient-noise` templates use literal naming/structure that backend can mirror (coordinate with [backend] template issues).

## Acceptance
- All 12 templates render correctly. None drops below 50fps on desktop.
'@
  },
  @{
    Title = '[renderer] Mock harness: CSS-gradient stand-in for RendererAPI'
    Assignees = 'AndyHanDev'
    Labels = @('track:renderer','tier:1','contract')
    Body = @'
**Owner:** AndyHanDev
**Contract:** §1 — test harness clause

Ship a drop-in fake `RendererAPI` so the editor and UX tracks can build without WebGL.

## Tasks
- [ ] `web/src/renderer/__mocks__/renderer.ts` exports a `createRenderer()` that:
  - Mounts a `<div>` with an animated CSS gradient.
  - `compile()` always returns `{ ok: true }`.
  - `snapshot()` returns a small fixed PNG data URL.
  - `onCompile` subscribers fire once on first compile.

## Acceptance
- Swap real renderer for mock in `integration/App.tsx` — UX still renders without errors.
'@
  },
  @{
    Title = '[renderer][tier-2] Lens stack capture API'
    Assignees = 'AndyHanDev'
    Labels = @('track:renderer','tier:2','contract')
    Body = @'
**Owner:** AndyHanDev
**Contract:** §1 — `LensStackAPI`

Render the same shader N times, each time discarding after line K. Returns N PNG data URLs for the UX side panel.

## Approach
- Inject `if (LENS_BREAK_LINE) { gl_FragColor = vec4(...); return; }` at requested line.
- For each break line: compile a variant, render to an offscreen FBO, `readPixels`, encode PNG.

## Tasks
- [ ] `createLensStack().capture(src, breakLines[])` → `Promise<string[]>`.
- [ ] Reuse the same offscreen FBO across calls.
- [ ] Tests with 3 break lines on a known template.

## Acceptance
- UX panel shows thumbnails of the shader frozen at each step.
'@
  },
  @{
    Title = '[renderer] Mobile perf: cap canvas resolution + FPS guardrails'
    Assignees = 'AndyHanDev'
    Labels = @('track:renderer','tier:1','demo-blocker')
    Body = @'
**Owner:** AndyHanDev

Target: 60fps on a mid-range Android phone.

## Tasks
- [ ] On mobile (`window.matchMedia("(pointer: coarse)").matches`), cap drawing buffer to `min(deviceWidth * dpr, 1280)`.
- [ ] If `getFps()` drops below 45 for 2s, halve the resolution (with a one-time toast via `onCompile`-like event).
- [ ] Document the policy in `renderer/README.md`.

## Acceptance
- All 12 templates hit 60fps on a real mid-range phone (test on a Pixel 5 or equivalent).
'@
  },

  # ───────────── Editor (10) — zajalist ─────────────
  @{
    Title = '[editor][contract] Publish editor/index.ts skeleton + mock textarea'
    Assignees = 'zajalist'
    Labels = @('track:editor','tier:1','contract','demo-blocker')
    Body = @'
**Owner:** zajalist
**Contract:** `CONTRACTS.md` §2

## Tasks
- [ ] `web/src/editor/index.ts` exports `EditorPane`, `parse`, `findLiterals`, `findPatterns`, `replaceLiteral`, types — per §2.
- [ ] All methods stubbed but typecheck.
- [ ] `web/src/editor/__mocks__/editor.ts` exports an `EditorPane` that wraps `<textarea>` — for renderer/UX teams.

## Acceptance
- UX can import `<EditorPane>` from either real or mock and the typecheck is identical.
'@
  },
  @{
    Title = '[editor] CodeMirror 6 + GLSL syntax highlighting'
    Assignees = 'zajalist'
    Labels = @('track:editor','tier:1','demo-blocker')
    Body = @'
**Owner:** zajalist

## Tasks
- [ ] CodeMirror 6 mounted inside `<EditorPane>`.
- [ ] GLSL syntax highlighting (use C-like mode + custom keyword list if no GLSL grammar package is acceptable).
- [ ] Dark + light themes, follows system pref.
- [ ] Mobile-friendly: `EditorView.editable.of(true)`, touch caret works.

## Acceptance
- Typing GLSL in `<EditorPane>` shows keywords in color.
'@
  },
  @{
    Title = '[editor] Zustand source store (single source of truth)'
    Assignees = 'zajalist'
    Labels = @('track:editor','tier:1','contract')
    Body = @'
**Owner:** zajalist
**Contract:** §2 — "source string is the single source of truth"

There is NO separate "handle state". Every interaction mutates the source string.

## Tasks
- [ ] `web/src/editor/state.ts` exports `useEditorStore` (Zustand) with `{ source, setSource }`.
- [ ] `<EditorPane>` is a controlled component over `source` + `onSourceChange`.
- [ ] No internal cache of "handle positions". Re-derive from AST every change.

## Acceptance
- Setting `source` externally is reflected in the editor view immediately.
- Internal edits call `onSourceChange` once per change (debounce ok, but not lossy).
'@
  },
  @{
    Title = '[editor] glsl-parser integration + AST cache'
    Assignees = 'zajalist'
    Labels = @('track:editor','tier:1','demo-blocker')
    Body = @'
**Owner:** zajalist
**Contract:** §2 — `parse(src): Ast`

## Tasks
- [ ] Add `glsl-parser` dep.
- [ ] `parse(src)` returns cached AST. Cache keyed by exact source string (`Map<string, Ast>`, capped at 32 entries LRU).
- [ ] Handle parse errors: return a sentinel AST so downstream `findLiterals`/`findPatterns` return `[]` instead of throwing.

## Acceptance
- Parsing the same source twice returns the same object reference.
- A broken source does not throw — returns an "empty" AST.
'@
  },
  @{
    Title = '[editor] Numeric literal decorations + drag-to-scrub'
    Assignees = 'zajalist'
    Labels = @('track:editor','tier:1','demo-blocker')
    Body = @'
**Owner:** zajalist

The "hero" bidirectional interaction. Long-press / tap-and-hold on a number, drag to scrub the value; source updates live.

## Tasks
- [ ] Walk AST, decorate every `float`/`int` literal in CodeMirror with a `Decoration.mark` wrapper.
- [ ] Pointer/touch handler: on long-press (300ms) or alt-drag (desktop), enter scrub mode.
- [ ] Scrub sensitivity: 1 px = 0.01 for small magnitudes, scales by current value.
- [ ] On drag, call `replaceLiteral(src, handleId, newValue)` and emit `onSourceChange`.
- [ ] Visual: handle shows a thin slider strip while scrubbing.

## Acceptance
- Long-press `0.5` in a template, drag right, value increases, canvas changes live.
- Mobile + desktop both work.
'@
  },
  @{
    Title = '[editor] Color literal vec3 swatch + color picker'
    Assignees = 'zajalist'
    Labels = @('track:editor','tier:1')
    Body = @'
**Owner:** zajalist

`vec3(r, g, b)` literals get a small color swatch in the gutter. Tap → color picker → updates the three literals.

## Tasks
- [ ] AST pass: find `vec3(<float>, <float>, <float>)` call expressions.
- [ ] Gutter widget shows current color (assumes r/g/b ∈ [0,1]).
- [ ] Tap opens a color picker (use a small dep like `react-colorful`).
- [ ] On pick, mutate all three literals atomically via `replaceLiteral` calls.

## Acceptance
- Picking a color in a template updates the vec3 in source AND the canvas re-renders.
'@
  },
  @{
    Title = '[editor] Pattern matcher: length(uv - vec2(x,y)) → circle handle'
    Assignees = 'zajalist'
    Labels = @('track:editor','tier:2','contract')
    Body = @'
**Owner:** zajalist
**Contract:** §2 — `PatternHandle.kind === "circle"`

Recognize `length(uv - vec2(X, Y))` (with or without `- R` after) and expose `{ cx, cy, r? }` as a `PatternHandle`. UX renders a draggable target on the canvas.

## Tasks
- [ ] AST matcher: function call `length` whose arg is a subtract whose right is `vec2(X, Y)`.
- [ ] Detect optional `- <float>` for radius.
- [ ] Emit `PatternHandle` via `findPatterns(ast)` and through the `onPatternsChange` prop.

## Acceptance
- Loading the `plain-circle` template emits one circle PatternHandle.
'@
  },
  @{
    Title = '[editor] Pattern matcher: vec3 at end of main → color handle'
    Assignees = 'zajalist'
    Labels = @('track:editor','tier:2','contract')
    Body = @'
**Owner:** zajalist
**Contract:** §2 — `PatternHandle.kind === "color"`

Recognize the `vec3` literal that flows into the final `gl_FragColor` (or `out_color`) assignment in `main()`.

## Tasks
- [ ] AST matcher: find the last assignment in `main()` to `gl_FragColor`/`fragColor`/`out_color` and locate the contributing vec3 literal.
- [ ] If the rhs is `vec4(<vec3>, 1.0)`, recurse into the vec3.
- [ ] Emit a `color` PatternHandle.

## Acceptance
- `soft-gradient` template emits one color PatternHandle pointing at the right vec3.
'@
  },
  @{
    Title = '[editor] Pattern matcher: smoothstep(A,B,x) → 1D handle'
    Assignees = 'zajalist'
    Labels = @('track:editor','tier:2','contract')
    Body = @'
**Owner:** zajalist
**Contract:** §2 — `PatternHandle.kind === "smoothstep"`

Recognize `smoothstep(A, B, x)` calls and emit `{ a, b }` literal handles. UX renders a 1D handle strip overlay.

## Tasks
- [ ] AST matcher: function call `smoothstep` with the first two args being numeric literals.
- [ ] Multiple per shader: emit one PatternHandle per call site.

## Acceptance
- `radial-bands` template emits two smoothstep PatternHandles.
'@
  },
  @{
    Title = '[editor] replaceLiteral mutation + AST→source round-trip test'
    Assignees = 'zajalist'
    Labels = @('track:editor','tier:1','contract')
    Body = @'
**Owner:** zajalist
**Contract:** §2 — `replaceLiteral`

The inverse direction. UX calls this when the user drags a canvas handle. Source is mutated by string slice at the literal's `loc.start`/`loc.end` — NOT by re-printing the AST.

## Tasks
- [ ] `replaceLiteral(src, handleId, newValue)` returns new source string.
- [ ] Handles `number` and `[number, number, number]` (for color).
- [ ] Stable `handleId` across edits within the same AST shape (use AST path hash).
- [ ] Test: parse all 12 templates, find all literals, replace each with itself → source string is byte-identical.

## Acceptance
- The round-trip test passes for all 12 templates.
'@
  },

  # ───────────── ML Backend (10) — zajalist ─────────────
  @{
    Title = '[backend][contract] FastAPI skeleton + openapi.yaml + mirror types to shared/'
    Assignees = 'zajalist'
    Labels = @('track:ml-backend','tier:1','contract','demo-blocker')
    Body = @'
**Owner:** zajalist
**Contract:** `CONTRACTS.md` §3

## Tasks
- [ ] `backend/app/main.py` mounts the `/optimize` route (stub that returns 501) and the WS route.
- [ ] `backend/openapi.yaml` declares the REST schema verbatim from §3.
- [ ] `web/src/shared/backend-types.ts` exports TypeScript types that mirror §3 (`OptimizeFrame` union, request/response shapes).
- [ ] CORS allows `http://localhost:5173`.

## Acceptance
- `curl -X POST http://localhost:8000/optimize -d '{}' -H "content-type: application/json"` returns 501 with a JSON body.
- TS shared types match the YAML by inspection.
'@
  },
  @{
    Title = '[backend] POST /optimize handler + job_id allocation'
    Assignees = 'zajalist'
    Labels = @('track:ml-backend','tier:1','demo-blocker')
    Body = @'
**Owner:** zajalist
**Contract:** §3 REST

## Tasks
- [ ] Validate request body (template_id is one of 3 known, image is ≤1 MB base64).
- [ ] Allocate a `job_id` (uuid4).
- [ ] Store job in an in-memory registry `{job_id -> JobState}`. (No DB.)
- [ ] Respond 202 with `{ job_id, ws_url }`.
- [ ] On invalid input, respond 4xx with `{error}`.

## Acceptance
- POST with a real PNG returns 202 + job_id.
- POST with an unknown template_id returns 400.
'@
  },
  @{
    Title = '[backend] WebSocket /optimize/stream/{id} + OptimizeFrame schema'
    Assignees = 'zajalist'
    Labels = @('track:ml-backend','tier:1','contract','demo-blocker')
    Body = @'
**Owner:** zajalist
**Contract:** §3 WebSocket + `OptimizeFrame`

## Tasks
- [ ] WS endpoint accepts a connection only for known `job_id`.
- [ ] Streams frames as JSON one per WebSocket message.
- [ ] Sends `{type:"progress"}` every 25 optim steps (frame includes `preview_b64`).
- [ ] Sends `{type:"done"}` once at the end with `final_params` and `glsl`.
- [ ] Sends `{type:"error"}` on failure and closes.
- [ ] Closes the connection after `done` or `error`.

## Acceptance
- A test client connecting to the WS sees a frame every ~25 steps and exactly one terminal frame.
'@
  },
  @{
    Title = '[backend] PyTorch template: plasma (diffable, params exposed)'
    Assignees = 'zajalist'
    Labels = @('track:ml-backend','tier:1','demo-blocker')
    Body = @'
**Owner:** zajalist

The first photo-matchable template. **Math must match `web/src/renderer/templates/plasma.glsl` exactly.** Document the shared math in code comments so they don't drift.

## Exposed params (suggested; finalize with renderer)
- `freq_x`, `freq_y` — float
- `phase` — float
- `color_a`, `color_b` — vec3
- `time_scale` — float

## Tasks
- [ ] `backend/templates/plasma.py` defines `render(params, resolution) -> Tensor[H,W,3]`.
- [ ] Pure PyTorch ops, all differentiable.
- [ ] Coordinate with the renderer issue: same `freq_x` etc names appear as literals in the GLSL template.

## Acceptance
- Running `render(initial_params, (256,256))` produces a tensor that, rendered alongside the GLSL version with the same params, looks within MSE 0.02 (visual sanity).
'@
  },
  @{
    Title = '[backend] PyTorch template: voronoi-cells'
    Assignees = 'zajalist'
    Labels = @('track:ml-backend','tier:2')
    Body = @'
**Owner:** zajalist

Same shape as the plasma template issue. Math must mirror `voronoi-cells.glsl`.

## Tasks
- [ ] `backend/templates/voronoi.py` with `render(params, resolution) -> Tensor`.
- [ ] Differentiable cell distance (use soft-min, NOT hard `min`, so gradients flow).

## Acceptance
- Renders with bogus params; loss decreases over 50 Adam steps against any target image.
'@
  },
  @{
    Title = '[backend] PyTorch template: gradient-noise'
    Assignees = 'zajalist'
    Labels = @('track:ml-backend','tier:2')
    Body = @'
**Owner:** zajalist

Same shape as the plasma template issue. Math must mirror `value-noise.glsl`.

## Tasks
- [ ] `backend/templates/gradient_noise.py`.
- [ ] Differentiable lerp + hash (a smooth hash works fine).

## Acceptance
- Same convergence sanity check as voronoi.
'@
  },
  @{
    Title = '[backend] LPIPS + MSE loss blend + Adam optimizer loop'
    Assignees = 'zajalist'
    Labels = @('track:ml-backend','tier:1','demo-blocker')
    Body = @'
**Owner:** zajalist

The actual optimization. Spec §7.

## Tasks
- [ ] `backend/optim/loss.py`: `loss = lpips(rendered, target) + 0.1 * mse(rendered, target)`.
- [ ] LPIPS via the `lpips` pip package, VGG backbone, in eval mode.
- [ ] `backend/optim/loop.py`: Adam, lr=0.02, default 500 steps.
- [ ] Cap wall-clock at 30s (param to override down for dev).
- [ ] Detach + downsample target to 256×256.

## Acceptance
- On a fixed input image + plasma template, after 500 steps the visual result is recognizable, loss is decreasing throughout (no NaN explosions).
'@
  },
  @{
    Title = '[backend] 3 random inits in parallel, return best'
    Assignees = 'zajalist'
    Labels = @('track:ml-backend','tier:2')
    Body = @'
**Owner:** zajalist

Spec §11 risk mitigation: local minima are common. Run 3 parallel inits and return the lowest-loss one.

## Tasks
- [ ] Run 3 optim chains, each with different random init (set seeds).
- [ ] Stream progress frames from the currently-best chain (so the user sees something coherent in real time).
- [ ] On `done`, return the lowest-final-loss result.

## Acceptance
- On a known-hard image, the best of 3 is visibly better than a single run (eyeballed on 5 test images).
'@
  },
  @{
    Title = '[backend] GLSL filler: interpolate params into template string'
    Assignees = 'zajalist'
    Labels = @('track:ml-backend','tier:1','contract')
    Body = @'
**Owner:** zajalist
**Contract:** §3 — `done.glsl`

After optimization, fill the final parameter values into the GLSL template and return as a string.

## Tasks
- [ ] `backend/templates/<id>.glsl` ships alongside the python; same literals/structure as `web/src/renderer/templates/<id>.glsl`.
- [ ] Replace `// PARAM: freq_x` style placeholders with the final values.
- [ ] Validate output by re-parsing or by compile-check via a node subprocess (optional — only if cheap).

## Acceptance
- The returned `glsl` string, when handed to the live renderer, produces output that matches the final `preview_b64` within MSE 0.01.
'@
  },
  @{
    Title = '[backend] CPU fallback + 30s cap + mock_server.py + Modal deploy'
    Assignees = 'zajalist'
    Labels = @('track:ml-backend','tier:1','demo-blocker','contract')
    Body = @'
**Owner:** zajalist

The production-readiness pass. Without these, the demo dies if wifi or the GPU times out.

## Tasks
- [ ] If `torch.cuda.is_available() == False`, downsample target to 64×64, cap to 200 steps. Log a warning.
- [ ] Hard wall-clock cap at 30s — return whatever the best result so far is.
- [ ] `backend/scripts/mock_server.py` — streams pre-recorded frames over WS for UX teammates without a GPU. Same `OptimizeFrame` schema.
- [ ] Modal (or Replicate) deploy config + a README section on how to update it.
- [ ] Document the URL UX should point `VITE_BACKEND_URL` at.

## Acceptance
- `python scripts/mock_server.py` runs locally and serves the same wire format as the real server.
- A deployed instance answers `GET /health` over HTTPS.
'@
  },

  # ───────────── UX / Mobile / Demo (11) — AndyHanDev ─────────────
  @{
    Title = '[ux][contract] Publish ux/index.ts skeleton (AppShell + share URL utilities)'
    Assignees = 'AndyHanDev'
    Labels = @('track:ux-mobile','tier:1','contract','demo-blocker')
    Body = @'
**Owner:** AndyHanDev
**Contract:** `CONTRACTS.md` §4

## Tasks
- [ ] `web/src/ux/index.ts` exports `AppShell`, `encodeShareUrl`, `decodeShareUrl` per §4.
- [ ] Stubbed but typechecks.
- [ ] UX is the ONLY frontend module allowed to import from renderer/ + editor/. Lint rule enforces.

## Acceptance
- `integration/App.tsx` can instantiate `<AppShell>` with all required props.
'@
  },
  @{
    Title = '[ux] Desktop layout: canvas left / editor right'
    Assignees = 'AndyHanDev'
    Labels = @('track:ux-mobile','tier:1','demo-blocker')
    Body = @'
**Owner:** AndyHanDev

Spec §8 desktop layout. Top bar with `[templates] [photo→] [share] [phone QR]`.

## Tasks
- [ ] CSS grid: header row + main row with two columns (60/40 split, resizable).
- [ ] Canvas pane hosts the renderer (mount via prop).
- [ ] Editor pane hosts `<EditorPane>`.
- [ ] Top bar with placeholder buttons.

## Acceptance
- At ≥1024px, layout matches the ASCII diagram in spec §8.
'@
  },
  @{
    Title = '[ux] Mobile layout: stacked + draggable handle'
    Assignees = 'AndyHanDev'
    Labels = @('track:ux-mobile','tier:1','demo-blocker')
    Body = @'
**Owner:** AndyHanDev

Spec §8 mobile layout. Canvas on top, editor below, drag a handle to switch which fills the screen. Bottom action bar.

## Tasks
- [ ] `@media (max-width: 768px)` switches to stacked.
- [ ] Drag handle uses `Pointer Events` (mouse + touch).
- [ ] Snap to 30/70, 50/50, 70/30. Animates with `transform`.
- [ ] Bottom sheet for templates + photo + save.

## Acceptance
- Works on a real phone (Safari iOS + Chrome Android). No layout jank when keyboard opens.
'@
  },
  @{
    Title = '[ux] Template gallery sheet'
    Assignees = 'AndyHanDev'
    Labels = @('track:ux-mobile','tier:1','demo-blocker')
    Body = @'
**Owner:** AndyHanDev

Picker that lists the 12 templates with thumbnails. Tapping one loads its source into the editor (which propagates to the renderer).

## Tasks
- [ ] Consume `templates/manifest.ts` (export from renderer).
- [ ] Grid view, 3 per row mobile, 4 desktop.
- [ ] Thumbnail uses the manifest's pre-rendered image OR a live `<canvas>` running the renderer in low-res.
- [ ] Tapping a template calls `onEditorSourceChange(template.source)`.

## Acceptance
- All 12 templates appear with recognizable thumbnails. Tapping one updates editor + canvas.
'@
  },
  @{
    Title = '[ux] Photo upload + camera capture UI'
    Assignees = 'AndyHanDev'
    Labels = @('track:ux-mobile','tier:2','demo-blocker')
    Body = @'
**Owner:** AndyHanDev

User picks a photo OR snaps one with the camera, then chooses a target template, then watches it converge.

## Tasks
- [ ] `<input type="file" accept="image/*" capture="environment">` on mobile triggers camera.
- [ ] Drag-and-drop on desktop.
- [ ] Show selected image as a thumbnail preview.
- [ ] "Match with → [template picker]" CTA; calls `onPhotoMatch(file, templateId)`.

## Acceptance
- On iPhone Safari, tapping "photo" opens camera. On desktop, drag-drop works.
'@
  },
  @{
    Title = '[ux] Share URL: hash encode/decode with version tag'
    Assignees = 'AndyHanDev'
    Labels = @('track:ux-mobile','tier:1','contract','demo-blocker')
    Body = @'
**Owner:** AndyHanDev
**Contract:** §4 — `encodeShareUrl` / `decodeShareUrl`

Entire shader source + uniform values encoded in URL hash. No backend.

## Tasks
- [ ] Format: `#v=1&s=<base64url(deflate(source))>&u=<base64url(json(uniforms))>`.
- [ ] Round-trip test: every template encodes + decodes byte-identical.
- [ ] Bump `v` whenever the format changes; both `encode` and `decode` handle old versions.

## Acceptance
- Sharing a URL from desktop, opening on phone, shows the same shader.
'@
  },
  @{
    Title = '[ux] QR code: open this shader on your phone'
    Assignees = 'AndyHanDev'
    Labels = @('track:ux-mobile','tier:1')
    Body = @'
**Owner:** AndyHanDev

A button in the top bar that pops a QR of the current share URL. Lets a judge snap with their phone during the demo.

## Tasks
- [ ] Use a small QR library (`qrcode` npm).
- [ ] Renders in a modal/popover that closes on outside click.
- [ ] Includes a "copy URL" fallback button.

## Acceptance
- Scan with phone camera → opens the same shader. Round-trip verified on Android + iOS.
'@
  },
  @{
    Title = '[ux] Touch gestures: pinch zoom canvas, long-press number scrub'
    Assignees = 'AndyHanDev'
    Labels = @('track:ux-mobile','tier:2')
    Body = @'
**Owner:** AndyHanDev

Spec §4 mobile interactions. Pinch zoom the canvas (writes a `u_zoom`/`u_pan` uniform). Long-press a number in editor → scrub (the editor team owns the in-editor part; this issue is about wiring touch-event consumption + canvas-side gestures).

## Tasks
- [ ] Pinch zoom: two-finger gesture sets `u_zoom` (float) + `u_pan` (vec2).
- [ ] One-finger pan inside canvas adjusts `u_pan` (when zoomed).
- [ ] Wire `<EditorPane>` `onPatternsChange` → render draggable handles overlaid on canvas (circle center, smoothstep strip).
- [ ] Handle drag → `editor.replaceLiteral` → `onEditorSourceChange`.

## Acceptance
- Drag a circle on canvas → editor literal updates → canvas updates. On mobile.
'@
  },
  @{
    Title = '[ux] Compile error surface in layout'
    Assignees = 'AndyHanDev'
    Labels = @('track:ux-mobile','tier:1','demo-blocker')
    Body = @'
**Owner:** AndyHanDev

Show GLSL compile errors from `renderer.onCompile` in the layout. Pass them as `errors` prop to `<EditorPane>` so the editor can underline the offending lines.

## Tasks
- [ ] Subscribe to `renderer.onCompile` in `AppShell`.
- [ ] Pass `errors` prop into `<EditorPane>`.
- [ ] Also show a non-blocking toast/banner with the first error message.

## Acceptance
- Breaking a template's GLSL surfaces an inline underline AND a banner. The last good shader keeps rendering.
'@
  },
  @{
    Title = '[ux] Photo→shader progress bar + reconnect/error UX'
    Assignees = 'AndyHanDev'
    Labels = @('track:ux-mobile','tier:2','demo-blocker')
    Body = @'
**Owner:** AndyHanDev

When `onPhotoMatch` is called, UX opens a modal showing the live `preview_b64` and a progress bar. Handles drops gracefully.

## Tasks
- [ ] Modal opens on optimize start, shows current `preview_b64` and step/total.
- [ ] Reconnect once on WS drop. After second drop, show "demo backup video" affordance.
- [ ] `error` frame → toast.
- [ ] On `done`, replace editor source with `glsl` from server (calls `onEditorSourceChange`).
- [ ] Cancel button aborts (close WS).

## Acceptance
- Run a real optimize against the backend → see streaming frames → end state lands in editor + canvas.
'@
  },
  @{
    Title = '[ux] Demo script + 10 pre-loaded remix examples + backup video'
    Assignees = 'AndyHanDev'
    Labels = @('track:ux-mobile','tier:1','demo-blocker')
    Body = @'
**Owner:** AndyHanDev

Spec §11 risk mitigation. **The demo is a feature.**

## Tasks
- [ ] `docs/demo-script.md` with the 60-second pitch verbatim.
- [ ] 10 curated example shader URLs in a "remix this" homepage panel.
- [ ] Practice the demo end-to-end 10 times. Note friction points. File polish issues.
- [ ] **Record a backup demo video** (OBS / phone capture) of the photo→shader flow working. Commit to `docs/demo-backup.mp4` (or link it from `docs/demo-script.md`).
- [ ] Curate 3 photos that demo well (high-contrast, clear color palette).

## Acceptance
- A backup video file exists. The demo script is rehearsed and timed.
'@
  },

  # ───────────── Integration (4) — both ─────────────
  @{
    Title = '[integration] App.tsx wiring: renderer + editor + ux assembly'
    Assignees = 'zajalist','AndyHanDev'
    Labels = @('track:integration','tier:1','demo-blocker')
    Body = @'
**Owners:** both

The seam. This is where the contracts meet.

## Tasks
- [ ] `web/src/integration/App.tsx`:
  - Instantiate `createRenderer()` once.
  - Hold `source` in Zustand store.
  - Pass `renderer`, `source`, `onEditorSourceChange`, `errors`, `onPhotoMatch` into `<AppShell>`.
  - Subscribe to `renderer.onCompile` → pump errors back into AppShell.
  - On source change, call `renderer.compile(source)` debounced ~100ms.
- [ ] `web/src/integration/main.tsx` mounts to `#root`.
- [ ] Boot loads either the URL-hash share state OR a default template.

## Acceptance
- Editing GLSL in the editor live-updates the canvas. End-to-end. No mocks.
'@
  },
  @{
    Title = '[integration] Backend client: optimizePhoto + WebSocket consumer'
    Assignees = 'zajalist','AndyHanDev'
    Labels = @('track:integration','tier:2','demo-blocker')
    Body = @'
**Owners:** both

`web/src/integration/backend-client.ts` exports `optimizePhoto(file, templateId, onFrame)`. UX calls this when the user taps "match" — UX never touches WebSockets itself.

## Tasks
- [ ] Read `VITE_BACKEND_URL` from env, default `http://localhost:8000`.
- [ ] `optimizePhoto`:
  1. Base64-encode the image (≤1MB after downscale).
  2. POST `/optimize` → get `job_id, ws_url`.
  3. Open WS to `ws_url`, forward each frame to `onFrame`.
  4. Close on `done`/`error`.
- [ ] Reconnect once on drop.
- [ ] Throws typed errors UX can map to UI states.

## Acceptance
- Calling `optimizePhoto(file, "plasma", console.log)` against the real backend logs frames and resolves on `done`.
'@
  },
  @{
    Title = '[integration] E2E smoke: template → drag literal → share URL → reopen'
    Assignees = 'zajalist','AndyHanDev'
    Labels = @('track:integration','tier:1','demo-blocker')
    Body = @'
**Owners:** both

Manual test script (or Playwright if cheap) for the hero loop. Run before every "we are ready to demo" claim.

## Steps
1. Open app fresh → see default template render.
2. Open template gallery → pick `plain-circle` → editor + canvas both update.
3. Long-press a numeric literal → drag → literal AND canvas update.
4. Open color picker on a vec3 → change → updates everywhere.
5. Drag the circle center on the canvas → editor literal updates.
6. Click "share" → copy URL.
7. Open URL in a new tab → identical state appears.

## Acceptance
- All 7 steps succeed without console errors. Repeatable.
'@
  },
  @{
    Title = '[integration] Mid-range phone perf + bug bash'
    Assignees = 'zajalist','AndyHanDev'
    Labels = @('track:integration','tier:1','demo-blocker')
    Body = @'
**Owners:** both

Spec §11. Test on a real mid-range phone weekly. Catch the things desktop hides.

## Tasks
- [ ] Run all 12 templates on a Pixel 5 / iPhone 11 class device. Note any < 45fps.
- [ ] Try the share-URL flow round-trip on phone.
- [ ] Try the photo→shader flow on phone (camera capture).
- [ ] Find every layout jank that happens when the soft keyboard opens.
- [ ] File bug-bash issues for each finding.

## Acceptance
- A written log in `docs/bugbash-<date>.md` of every issue found + the fix PR for each.
'@
  },

  # ───────────── Stretch (4) ─────────────
  @{
    Title = '[stretch] Animation timeline recorder → GIF/MP4 export'
    Assignees = 'AndyHanDev'
    Labels = @('track:ux-mobile','tier:3')
    Body = @'
**Owner:** AndyHanDev (UX)

Record the canvas for N seconds, export GIF or WebM. Skip if behind.

## Tasks
- [ ] `MediaRecorder` on the canvas stream.
- [ ] Save as `.webm`. (GIF via `gif.js` if WebM unsatisfactory.)
- [ ] UI: record button → countdown → save dialog.

## Acceptance
- Click record, 5s later download a video.
'@
  },
  @{
    Title = '[stretch] Audio reactivity: u_audio uniform from mic FFT'
    Assignees = 'AndyHanDev'
    Labels = @('track:renderer','tier:3')
    Body = @'
**Owner:** AndyHanDev (Renderer)

Expose a `u_audio` uniform from microphone FFT energy. Toggle in UI. Skip if behind.

## Tasks
- [ ] `getUserMedia({audio:true})` → `AnalyserNode` → bass-band energy → smoothed float.
- [ ] Renderer sets `u_audio` per frame when enabled.
- [ ] Browser permission UX in the top bar.

## Acceptance
- `plasma` shader reacts to clapping when audio is enabled.
'@
  },
  @{
    Title = '[stretch] SDF playground mode'
    Assignees = 'AndyHanDev'
    Labels = @('track:renderer','tier:3')
    Body = @'
**Owner:** AndyHanDev (Renderer)

A separate route/mode that uses an SDF composition paradigm (`smin`, primitive combinators) instead of raw fragment-shader editing. Spec §4 calls this out as "too big for v1" — only do if the hero loop ships early and there is real free time.

## Acceptance
- A toggle between "raw" and "SDF" modes. SDF mode has a different template set.
'@
  },
  @{
    Title = '[stretch] Account-free gallery feed'
    Assignees = 'zajalist'
    Labels = @('track:ml-backend','track:ux-mobile','tier:3')
    Body = @'
**Owners:** zajalist (backend) + AndyHanDev (UX)

Public homepage feed of shared shaders. Backend stores `{id, source, thumbnail, created_at}`. No auth.

## Tasks
- [ ] `POST /share` accepts `{source, thumbnail}` returns short id.
- [ ] `GET /gallery` returns recent N.
- [ ] UX: "share to gallery" button next to "share URL".
- [ ] Storage: SQLite is fine. Rate-limit by IP.

## Acceptance
- Submit from one browser, see it appear in another browser's gallery within 1s.
'@
  }
)

Write-Host "Creating $($issues.Count) issues..."

$created = @()
$i = 0
foreach ($issue in $issues) {
  $i++
  $bodyFile = Join-Path $tmp ("issue-{0:D3}.md" -f $i)
  Set-Content -Path $bodyFile -Value $issue.Body -Encoding UTF8
  $labelArgs = $issue.Labels | ForEach-Object { @('--label', $_) }
  $assigneeArgs = $issue.Assignees | ForEach-Object { @('--assignee', $_) }
  $args = @('issue','create','--repo',$repo,'--title',$issue.Title,'--body-file',$bodyFile) + $labelArgs + $assigneeArgs
  $out = & gh @args 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Failed: $($issue.Title)`n$out"
  } else {
    $url = ($out | Select-String -Pattern 'https://\S+').Matches[0].Value
    $created += [pscustomobject]@{ Title = $issue.Title; Url = $url }
    Write-Host ("  [{0:D2}] {1}" -f $i, $issue.Title)
  }
}

Write-Host "`nDone. Created $($created.Count) of $($issues.Count) issues."
$created | Format-Table -AutoSize
