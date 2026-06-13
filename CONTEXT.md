# CONTEXT — domain glossary

Shared vocabulary for the Shaddy composer. Architectural contracts (the track
seams, the Recipe→GLSL pipeline) live in [`CONTRACTS.md`](./CONTRACTS.md); this
file names the *concepts* so reviews and refactors talk about the same things.

## Recipe / Card (see CONTRACTS.md §3 for the full surface)

- **Recipe** — the source of truth for what's on the canvas. The emitted GLSL is
  a projection. Positional `Card[]` (per ADR 2026-06-03 it stays an ordered
  array, not a keyed store).
- **Card** — a typed library entry or a wildcard, compiled into the uv→d→col
  fragment body.
- **AnimChain / AnimBlock** — a custom animation is an ordered chain of animation
  blocks that fold to one `_anim_<id>` scalar a param binds to (`animation:
  {type:'custom', ref:<chainId>}`). Chains are **derived from canvas grouping**:
  a snapped run of anim blocks IS a chain; an unsnapped block is its own chain.
  `setAnimChainsFromRuns` rebuilds the grouping from positions on every drop.

## Composer canvas

- **Canvas block** — a positioned, interlocking, run-draggable block on the
  composer canvas. A `Card` and an `AnimBlock` are the two *species* of canvas
  block; both render through the `<Block>` component (cards in their category
  colour with a classic connector, anim blocks in cyan with a round connector so
  the species can't mate). They share the free-canvas drag.
- **Free-canvas layout** (`design/free-canvas-layout.ts`) — the *pure spatial*
  logic over canvas blocks: `rightChildMap`/`leftParentMap` (adjacency →
  notch/tab variant), `runForMode` (which blocks a grab carries), `readingOrder`
  (positions → compile order). Already deep + unit-tested.
- **Drag reducer** (`design/canvas-drag.ts`) — the *pure* drag state-machine:
  `reduce(dragState, event, world, config) → {nextState, commands}`. It is the
  single home for run-selection, snap (one bidirectional policy), and drop
  (flush-place + emit `order` and `runs`). Pure → it is the test surface for the
  drag, which `free-canvas-layout` alone could not pin (the bugs were in the
  imperative glue, not the pure helpers).
- **`useCanvasDrag`** — the thin React hook wiring DOM pointer events ↔ the drag
  reducer. Holds the reducer's transient drag state, converts screen→world once,
  and executes commands. Does NOT own positions: the host (`Chain`) keeps the one
  shared `pos` map keyed by canvas-block id, so cards and anim blocks snap to
  their own kind within one coordinate space.
- **Notes** (group comments + post-its) — a *different* drag shape: move a box
  and its member blocks, no chain-snap. Deliberately NOT a canvas block; kept out
  of the drag reducer so the reducer stays deep rather than branching on
  box-vs-block.
