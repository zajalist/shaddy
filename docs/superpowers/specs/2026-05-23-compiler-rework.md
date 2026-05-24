# Shade Compiler Rework — Spec

> Adapts the engineering handoff at `D:\Personal\Resume\SHADE_COMPILER_HANDOFF.md` against the current state of the repo. Locks decisions on conflicts; surfaces open questions for the product owner at the end.
>
> **The handoff is the canonical spec.** This document is the diff + decision log. Read the handoff first.

## Goal (one sentence)

Replace the current `src/cards/` compiler with a standalone `src/compiler/` module that owns the Recipe ↔ GLSL round-trip per the handoff, plus a fixed-shape Animation system, an escape-hatch `custom` block, and self-contained tests that can prove correctness without a real WebGL context.

## Why "rework" instead of "extend"

The handoff and the shipped `src/cards/` module disagree on enough structural points that an in-place mutation would be more confusing than a clean rewrite alongside, followed by a swap. Specifically:

| | Shipped (`src/cards/`) | Handoff (`src/compiler/`) |
|---|---|---|
| Domain word | "Card" | "Block" |
| Recipe schema | no `version`, no `globalTempo` | `version: 1`, `globalTempo: number` |
| Block schema | discriminated `kind: 'typed' \| 'wildcard'` | flat `Block` with one `type: BlockType`; `custom` is a regular block whose `code` param holds raw GLSL |
| Parameter values | `number \| ColorRgb` (no vec2) | `number \| [n,n] \| [n,n,n]` |
| Animations | placeholder field `animation: null` only | five fully-typed animation types compiled to inline locals |
| Marker comment | `//#card cN Friendly { paramKey:value }` | `// @shade:block id="…" type="…" params=<JSON>` + `// @shade:end <id>` |
| Reverse parse strategy | normalize each span body vs `expectedBody`; structural divergence flips to wildcard | parse params JSON out of the magic comment; never compare GLSL bodies |
| Compile output | `glsl` BODY only; renderer prepends preamble | full shader incl. `precision`, uniform decls, `void main()`, `gl_FragColor = …` |
| `CompileResult` shape | `{ glsl, spans, uniforms }` always succeeds | `{ ok: true; glsl; uniforms } \| { ok: false; error; partialGlsl? }` |
| `UniformBinding` shape | `{ name, cardId, paramKey, value }` (renderer reads value directly) | `{ name; type; source: discriminated union }` (renderer dereferences via source) |
| GL profile | WebGL2 (`out vec4 fragColor`) | WebGL1 (`gl_FragColor`) |
| Library scope | 25 cards | 15 blocks (+ custom) — handoff explicitly says "cut to 11 if behind" |

Two of these collide hard with code already in production (`renderer/` is WebGL2; UI consumes the cards module's shape). The plan handles them via parallel implementation + swap — not in-place migration.

## Scope

**In:** Everything under `src/compiler/`:
- `types.ts` — the contract
- `helpers.ts` — five GLSL helpers (noise, voronoi, hsv2rgb, hash, rotate2d)
- `markers.ts` — `@shade:block` / `@shade:end` / `@shade:recipe` emit + parse
- `anim.ts` — animation expression emitter (five types)
- `compile.ts` — forward compiler
- `parse.ts` — reverse parser
- `blocks/*.ts` — 15 typed blocks + `custom`
- `index.ts` — public surface (`compile`, `parseShadeGlsl`, `BLOCK_LIBRARY`, `makeDefaultBlock`, `validateRecipe`)
- Vitest suite for each block, animations, round-trips
- **Optional** headless-gl integration test gate

**Out:**
- The editor UI — handoff explicitly notes "you do not own the editor UI."
- The renderer — separate person.
- AI / Claude SDK import path.
- Photo→shader optimizer.
- Migrating `src/cards/` consumers (`AppShell.tsx`, `CardStack`, etc.) — separate plan once the compiler is stable.

## Open questions / locked decisions

Items the handoff leaves to the team. **Defaults locked here for the plan to be unblocked** — flagged at the end of the response for the product owner to override before implementation starts.

1. **GL profile.** Handoff emits `precision highp float;` + `gl_FragColor` (WebGL1). Shipped renderer is WebGL2 (`out vec4 fragColor`, `#version 300 es`).
   - **Locked default:** Emit the WebGL2 profile (`#version 300 es`, `precision highp float;`, `in vec2 v_uv`, `out vec4 fragColor`, `uniform`s, `void main()`, … `fragColor = vec4(col, 1.0);`). Adapts the handoff's example. Renderer team should stop wrapping (compiler emits the full shader).
2. **Block naming.** Handoff uses "block." Shipped code uses "card." Mixing is bad.
   - **Locked default:** "Block" inside `src/compiler/`. The `src/cards/` UI module keeps the word "card" at its boundary until migrated; that migration is out of scope here.
3. **Custom block as discriminated kind vs typed block with a `code` param.** Handoff: typed block. Shipped: discriminated `kind: 'wildcard'`.
   - **Locked default:** Typed block per handoff. `ParamDef.kind: 'string'` is a new kind added for `custom.code` only.
4. **`UniformBinding` shape.** Handoff defines `source` as a discriminated union the renderer dereferences each frame. Shipped just hands the value.
   - **Locked default:** Adopt the handoff shape verbatim. The renderer migration in a separate PR.
5. **Headless-gl in CI.** Handoff calls it "your most important test." It adds a non-trivial dependency (~50 MB), needs native build tooling, may not work on every platform.
   - **Locked default:** Implement the test runner but mark it `it.skipIf(!process.env.HEADLESS_GL)` so it only runs when explicitly enabled. CI can opt in later.
6. **Block-library count.** Handoff lists 15. Shipped library has 25.
   - **Locked (product owner override):** Ship **all 25 + custom** in this PR. The 10 extras (`spiral`, `dots`, `checker`, `rotate`, `kaleidoscope`, `pixelate`, `invert`, `posterize`, `scanlines`, `brightness_contrast`) get re-authored under the new schema in Task 9b of the plan. No follow-up PR needed for library parity.
7. **Magic comment param JSON inside HTML / JS string interpolation.** Embedding raw JSON in a comment with `"` chars works in GLSL but is brittle if anything ever strips comments before another pass.
   - **Locked default:** Emit verbatim per the handoff regex. Document the brittleness in `markers.ts`.
8. **Recipe-header magic comment.** Handoff mentions `// @shade:recipe tempo=120 aspect=square` in passing.
   - **Locked default:** Emit once at top of `main()` body (after the prelude `vec2 uv`, before the first block). Parser reads it back for `globalTempo` + `canvasAspect`.
9. **`color_cycle` validation.** Handoff says compiler must reject `color_cycle` on non-color params.
   - **Locked default:** Return `CompileError` `{ code: 'param_type_mismatch' }` if `color_cycle` attached to a non-`vec3` param.
10. **`disabled` block emission.** Handoff says skip disabled blocks in `for each block where enabled`.
    - **Locked default:** Skip the block ENTIRELY — don't emit its markers, don't allocate its uniforms. Round-trip preserves this because we re-derive from the recipe, not from emitted source. (If a user-shipped recipe arrives with everything disabled, the result is an empty `main()` that just paints black.)

## Tech stack

- TypeScript (strict).
- Vitest (already configured).
- No new runtime deps. `nanoid` already in package.json; reuse it for fresh block ids.
- Optional dev dep: `gl` (the npm package providing headless WebGL) for the integration test runner. Gated behind `HEADLESS_GL=1`.

## Success criteria

The handoff's deliverable checklist is the success criteria, verbatim:

- [ ] All types in `src/compiler/types.ts` — locked in before any other work starts.
- [ ] Forward compiler `compile()` in `src/compiler/compile.ts`.
- [ ] Reverse parser `parseShadeGlsl()` in `src/compiler/parse.ts`.
- [ ] Block library in `src/compiler/blocks/*.ts` — one file per block, exported into `BLOCK_LIBRARY`.
- [ ] Helpers library in `src/compiler/helpers.ts`.
- [ ] Unit tests for every block (per-block render, uniform names, magic comments).
- [ ] Animation compilation tests for all 5 animation types.
- [ ] Round-trip test running over a hand-curated suite of 10+ recipes.
- [ ] Headless-gl integration test verifying every block produces valid GLSL (gated behind env var).
- [ ] All 25 blocks + `custom` block shipped and tested.

Plus, for the rework specifically:

- [ ] `src/cards/` module remains intact and importable (UI keeps working) until a follow-up PR migrates consumers to `src/compiler/`.
- [ ] No file under `src/compiler/` imports from `src/cards/` (one-way migration, no circular dependency).
