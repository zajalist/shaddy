import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import type { Recipe } from './types';

// New Repeat convention: a Repeat block is placed AFTER the shape(s) it tiles.
// It is a compile-time control card — it emits no forward uv mutation of its
// own; instead the preceding shape(s) get their body wrapped in a tiled-uv
// block. `scope` selects the reach:
//   0 'Direct chain' → the contiguous shape run immediately before it
//   1 'All shapes'   → every shape card before it

const sq = (id: string, size = 0.3) =>
  ({ kind: 'typed', id, type: 'square', enabled: true, params: { size: { value: size, animation: null }, edge: { value: 0.02, animation: null } } }) as const;
const tri = (id: string) =>
  ({ kind: 'typed', id, type: 'triangle', enabled: true, params: {} }) as const;
const palette = (id: string) =>
  ({ kind: 'typed', id, type: 'palette', enabled: true, params: { color_a: { value: [0, 0, 0], animation: null }, color_b: { value: [1, 1, 1], animation: null } } }) as const;
const repeat = (id: string, scope: number) =>
  ({ kind: 'typed', id, type: 'repeat', enabled: true, params: { count_x: { value: 4, animation: null }, count_y: { value: 4, animation: null }, scope: { value: scope, animation: null } } }) as const;

describe('repeat — after-shape control card', () => {
  it('wraps the immediately-preceding shape in a tiled-uv block (direct, default)', () => {
    const recipe: Recipe = { canvasAspect: 'square', cards: [sq('s0'), repeat('r1', 0)] };
    const out = compile(recipe);
    // The square body is now inside a save/tile/restore block.
    expect(out.glsl).toContain('{ vec2 _rep_uv = uv;');
    expect(out.glsl).toContain('uv = fract((uv * 0.5 + 0.5) * vec2(u_card1_count_x, u_card1_count_y)) * 2.0 - 1.0;');
    expect(out.glsl).toContain('uv = _rep_uv;');
    // Counts stay live uniforms; scope is compile-only (no uniform).
    expect(out.glsl).toContain('uniform float u_card1_count_x;');
    expect(out.glsl).not.toContain('u_card1_scope');
  });

  it('the repeat card itself emits no forward uv mutation (control card only)', () => {
    const recipe: Recipe = { canvasAspect: 'square', cards: [sq('s0'), repeat('r1', 0)] };
    const out = compile(recipe);
    const repSpan = out.spans.find((s) => s.cardId === 'r1');
    expect(repSpan?.expectedBody).toContain('// repeat');
    expect(repSpan?.expectedBody).not.toContain('fract(');
  });

  it('direct scope stops at a non-shape card (palette breaks the run)', () => {
    const recipe: Recipe = { canvasAspect: 'square', cards: [sq('s0'), palette('p0'), repeat('r1', 0)] };
    const out = compile(recipe);
    // No shape directly precedes the repeat → nothing is tiled.
    expect(out.glsl).not.toContain('_rep_uv');
  });

  it('all-shapes scope tiles every shape before it, even across a colour', () => {
    const recipe: Recipe = { canvasAspect: 'square', cards: [sq('s0'), palette('p0'), tri('t0'), repeat('r1', 1)] };
    const out = compile(recipe);
    // Both the square (index 0) and triangle (index 2) bodies get wrapped.
    const wraps = out.glsl.split('{ vec2 _rep_uv = uv;').length - 1;
    expect(wraps).toBe(2);
  });

  it('same recipe → byte-identical glsl (compiler invariant holds)', () => {
    const recipe: Recipe = { canvasAspect: 'square', cards: [sq('s0'), repeat('r1', 0)] };
    expect(compile(recipe).glsl).toBe(compile(recipe).glsl);
  });
});
