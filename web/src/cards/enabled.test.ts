import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import type { Recipe } from './types';

// A card with enabled:false must contribute NO GLSL (no uniforms, no helpers,
// no body) but still keep its marker + span 1:1 with recipe.cards so the
// reverse parser's marker-count check holds. See compiler-review roadmap
// (honor-card-enabled).
describe('honor Card.enabled in the compiler', () => {
  const base: Recipe = {
    canvasAspect: 'square',
    cards: [
      { kind: 'typed', id: 's0', type: 'square', enabled: true, params: { size: { value: 0.3, animation: null }, edge: { value: 0.02, animation: null } } },
      { kind: 'typed', id: 'p0', type: 'palette', enabled: true, params: { color_a: { value: [0, 0, 0], animation: null }, color_b: { value: [1, 1, 1], animation: null } } },
    ],
  };

  it('emits the disabled card s body as a note, with no uniforms', () => {
    const off: Recipe = { ...base, cards: [{ ...base.cards[0]!, enabled: false }, base.cards[1]!] };
    const out = compile(off);
    expect(out.glsl).toContain('// Square — disabled');
    expect(out.glsl).not.toContain('u_card0_size'); // its uniform is gone
    expect(out.uniforms.find((u) => u.cardId === 's0')).toBeUndefined();
    // Marker + span still present (1:1 with cards).
    expect(out.spans.length).toBe(2);
    expect(out.spans[0]?.cardId).toBe('s0');
  });

  it('keeps positional uniform indices for the surviving cards', () => {
    const off: Recipe = { ...base, cards: [{ ...base.cards[0]!, enabled: false }, base.cards[1]!] };
    const out = compile(off);
    // palette is index 1 → its uniforms keep u_card1_* names (not renumbered).
    expect(out.glsl).toContain('u_card1_color_a');
  });

  it('a disabled repeat tiles nothing', () => {
    const recipe: Recipe = {
      canvasAspect: 'square',
      cards: [
        { kind: 'typed', id: 's0', type: 'square', enabled: true, params: { size: { value: 0.3, animation: null }, edge: { value: 0.02, animation: null } } },
        { kind: 'typed', id: 'r1', type: 'repeat', enabled: false, params: { count_x: { value: 4, animation: null }, count_y: { value: 4, animation: null }, scope: { value: 0, animation: null } } },
      ],
    };
    expect(compile(recipe).glsl).not.toContain('_rep_uv');
  });
});
