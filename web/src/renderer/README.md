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
