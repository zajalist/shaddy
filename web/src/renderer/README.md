# renderer/

**Owner:** andyhandev
**Public surface:** [`index.ts`](./index.ts) — see [`../../../CONTRACTS.md`](../../../CONTRACTS.md) §1.

WebGL2 fragment shader runtime: compilation, hot-reload, fullscreen quad, standard uniforms (`u_time`, `u_resolution`, `u_mouse`), 12 starter templates, lens stack (Tier 2).

## Internal layout (private — don't import these from outside)
- `gl/` — WebGL2 boilerplate, program cache.
- `templates/` — the 12 starter shaders as `.glsl` strings.
- `lens-stack/` — Tier 2 multi-pass capture.
- `__mocks__/` — CSS-gradient fake `RendererAPI` for downstream tests.

## Don't
- Don't import from `editor/`, `ux/`, or `integration/`.
- Don't reach into anything that's not exported from `index.ts`.

## Mobile perf policy (issue #13)

Implemented in `mobile-perf.ts`, applied by `runtime.ts`:

1. **Initial drawing-buffer cap.** When `(pointer: coarse)` matches (mobile),
   the longest side of the WebGL drawing buffer is clamped to **1280 px**.
   Desktop gets the full `cssSize × devicePixelRatio` buffer.
2. **FPS watchdog.** Once `getFps()` stays **below 45** continuously for **2 s**,
   the drawing buffer is **halved** in both dimensions (down to a 256 px floor).
   The watchdog fires **at most once per mount** so the renderer doesn't
   recursively shrink. A `console.warn` records the halve event; UX surfaces
   can poll `getFps()` themselves if they want a richer toast.

These constants live in `mobile-perf.ts` (`MOBILE_MAX_LONG_SIDE_PX`,
`FPS_HALVE_THRESHOLD`, `FPS_HALVE_WINDOW_MS`, `MIN_DRAWING_BUFFER_SIDE_PX`)
so tuning doesn't require touching the runtime.
