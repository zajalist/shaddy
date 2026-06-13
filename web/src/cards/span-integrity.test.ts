import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import { sliceSpanBody } from './markers';
import type { Recipe } from './types';

// Each card emits into its own scratch pad (CardEmit), and the marker + body
// are stamped into the shared output exactly once. The invariant that buys us:
// a Span's expectedBody is ALWAYS exactly the source between its marker and its
// endLine — even through stacked wraps (repeat INNER, composition OUTER), which
// previously did splice surgery on the shared buffer that could corrupt a
// neighbouring card's span. See improve-codebase-architecture #3.

function assertSpansSliceCleanly(recipe: Recipe): void {
  const out = compile(recipe);
  for (const span of out.spans) {
    const sliced = sliceSpanBody(out.glsl, span.startLine, span.endLine);
    expect(sliced, `span ${span.cardId}`).toBe(span.expectedBody);
  }
}

const square = (id: string, alpha?: number) =>
  ({ kind: 'typed', id, type: 'square', enabled: true, alpha,
     params: { size: { value: 0.3, animation: null }, edge: { value: 0.02, animation: null } } }) as const;
const repeat = (id: string) =>
  ({ kind: 'typed', id, type: 'repeat', enabled: true,
     params: { count_x: { value: 4, animation: null }, count_y: { value: 4, animation: null }, scope: { value: 0, animation: null } } }) as const;
const palette = (id: string) =>
  ({ kind: 'typed', id, type: 'palette', enabled: true,
     params: { color_a: { value: [0, 0, 0], animation: null }, color_b: { value: [1, 1, 1], animation: null } } }) as const;

describe('span integrity (CardEmit)', () => {
  it('plain chain: every span slices back to its expectedBody', () => {
    assertSpansSliceCleanly({ canvasAspect: 'square', cards: [square('s0'), palette('p0')] });
  });

  it('repeat INNER + composition OUTER on the same card slices cleanly', () => {
    // square is composed (alpha 0.5) AND tiled by the following repeat — the
    // exact double-wrap that the old splice approach was fragile around.
    assertSpansSliceCleanly({ canvasAspect: 'square', cards: [square('s0', 0.5), repeat('r0'), palette('p0')] });
  });

  it('animated + composed card slices cleanly', () => {
    const sq = { kind: 'typed' as const, id: 's0', type: 'square', enabled: true, alpha: 0.7,
      params: { size: { value: 0.3, animation: { type: 'sine' as const, min: 0.1, max: 0.5, speed: 1, phase: 0 } }, edge: { value: 0.02, animation: null } } };
    assertSpansSliceCleanly({ canvasAspect: 'square', cards: [sq, palette('p0')] });
  });

  it('3D recipe: spans slice cleanly too', () => {
    assertSpansSliceCleanly({
      canvasAspect: 'square', mode: '3d',
      cards: [{ kind: 'typed', id: 'b0', type: 'sphere_3d', enabled: true, params: {} }],
    });
  });
});
