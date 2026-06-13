import { describe, expect, it } from 'vitest';
import { compile, validateRecipe } from './compile';
import type { Recipe } from './types';

// A macro card carrying two sub-blocks (radial_gradient → palette). The macro
// inline-expands to their GLSL with params baked as literal constants.
const RECIPE_MACRO: Recipe = {
  canvasAspect: 'square',
  cards: [
    {
      kind: 'typed', id: 'm0', type: 'macro', enabled: true, params: {},
      macro: {
        name: 'Sunset',
        blocks: [
          { kind: 'typed', id: 's0', type: 'radial_gradient', enabled: true, params: { softness: { value: 1, animation: null } } },
          {
            kind: 'typed', id: 's1', type: 'palette', enabled: true,
            params: {
              color_a: { value: [0.8, 0.2, 0.1], animation: null },
              color_b: { value: [0.1, 0.2, 0.9], animation: null },
            },
          },
        ],
      },
    },
  ],
};

describe('macros — compile (inline expansion with baked literals)', () => {
  it('expands sub-blocks with their params as GLSL literals', () => {
    const out = compile(RECIPE_MACRO);
    expect(out.glsl).toContain('d = 1.0 - clamp(length(uv) * 1.0, 0.0, 1.0);');
    expect(out.glsl).toContain('col = mix(vec3(0.8, 0.2, 0.1), vec3(0.1, 0.2, 0.9), clamp(d, 0.0, 1.0));');
  });

  it('emits NO per-card uniforms for a macro (params are baked, not wired)', () => {
    const out = compile(RECIPE_MACRO);
    expect(out.uniforms.length).toBe(0);
    expect(out.glsl).not.toContain('u_card');
  });

  it('is ONE marker / ONE span per macro card (reparse-friendly)', () => {
    const out = compile(RECIPE_MACRO);
    expect(out.spans.length).toBe(1);
    expect(out.spans[0]?.cardId).toBe('m0');
    expect(out.glsl).toContain('//#card m0 Sunset');
  });

  it('pulls in the sub-blocks\' helpers (so length()/mix() etc. resolve)', () => {
    // radial_gradient needs no extra helper, but this guards the helper-collection
    // path for macros — a macro of a noise block must still emit its helpers.
    const noisy: Recipe = {
      canvasAspect: 'square',
      cards: [{
        kind: 'typed', id: 'm1', type: 'macro', enabled: true, params: {},
        macro: { name: 'N', blocks: [{ kind: 'typed', id: 'n0', type: 'noise_field', enabled: true, params: {} }] },
      }],
    };
    const out = compile(noisy);
    // noise_field declares helpers; they must appear exactly once in the output.
    expect(out.glsl).toContain('// === helpers ===');
  });

  it('validateRecipe accepts macro cards', () => {
    expect(validateRecipe(RECIPE_MACRO)).toEqual([]);
  });

  it('compress=true strips arithmetic-identity ops (byte-identical, shorter)', () => {
    const plain = compile(RECIPE_MACRO);
    expect(plain.glsl).toContain('length(uv) * 1.0'); // softness=1 → identity multiply
    const base = RECIPE_MACRO.cards[0] as Extract<Recipe['cards'][number], { kind: 'typed' }>;
    const compressed: Recipe = {
      canvasAspect: 'square',
      cards: [{ ...base, macro: { ...base.macro!, compress: true } }],
    };
    const out = compile(compressed);
    expect(out.glsl).not.toContain('length(uv) * 1.0'); // the `* 1.0` is gone
    expect(out.glsl).toContain('d = 1.0 - clamp(length(uv), 0.0, 1.0);'); // same result, shorter
  });
});
