# Custom Animations — block-built signals bound to params

**Date:** 2026-06-03 · **Status:** approved, building

## Goal
Go beyond the fixed waveforms (sine/pulse/noise/mouse). Let users **build** a
custom animation out of blocks — a small "signal generator" chain that lives on
the same canvas as composer blocks, is a distinct species (can't puzzle-connect
to composer blocks), and is **bound** to one or more params with a visible link.
Reusable across params/blocks.

## Model (decided)
- A custom animation = an **animation chain**: a Time source → transform blocks
  (Oscillate, Remap, …) folded left→right into one scalar value-over-time.
- It's a **shared Recipe entity**: `Recipe.animations: AnimChain[]`. Persists +
  serialises (rides Share URLs). One chain can drive many params.
- A param binds via a new `Animation` variant `{ type: 'custom'; ref: chainId }`.
- Reading-order of anim blocks reuses `design/free-canvas-layout` (same canvas).

## Animation blocks (v1 — float signal)
`cards/anim-blocks.ts`: Time (source `v=u_time`), Oscillate (sine; speed/phase),
Pulse (speed/duty), Noise (speed; `noise2`), Remap (min→max), Ease (pow/curve),
Mouse (axis). Each transforms the running scalar `v`. Color-output + signal
fan-in are explicit v2s; v1 drives **float** params (colour keeps `color_cycle`).

## Compile
Each *referenced* chain folds to one per-frame local at the top of `main()`:
`float _anim_<id> = mix(min,max, sin(u_time*speed+phase)*.5+.5);`. Every bound
param's placeholder resolves to that local — reuse = one local, N references.
Chain block params become live uniforms (drag = setUniform, no relink), like
today's per-param anim. Pass-2 pulls anim-block helpers (noise→noise2). Byte-
identical for recipes with no custom animations.

## Canvas + visuals
- Anim blocks render on the world surface at editor positions, **distinct flat
  style** — no puzzle tab/notch, reserved **cyan** accent (≠ reroute-teal /
  macro-indigo).
- **anim↔anim** snap to chain; **anim↔composer never snaps** → a **subtle shake
  + brief red border flash** (~200ms, no glow).
- Chain tail has an **output dot**; **bindings** draw a thin cyan **link line**
  chain→driven block + a small **badge** on each driven block.

## Palette + inspector
- New **Animation tab**: the 7 anim blocks (drag to canvas) + existing chains.
- Inspector **∼** becomes a menu: built-in waveforms **+ "Custom"** (drops a new
  chain bound to this param) **+ "Bind: ‹name›…"** (reuse). Alt reuse: drag a
  chain's output dot onto a param/block.

## Slices
1. **Model + compile** — types (`Animation` custom, `AnimChain`/`AnimBlock`,
   `Recipe.animations`), `anim-blocks.ts` library, compiler emits chain locals +
   binds params. Tested. *(this slice first)*
2. **Canvas species + bind UX** — render anim blocks (distinct style, no-snap,
   shake/flash), output dot, link lines, badge; store actions; ∼-menu Custom/bind.
3. **Reuse + palette tab** — Animation palette tab; reuse via menu + drag.
