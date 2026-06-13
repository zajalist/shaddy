import { describe, expect, it } from 'vitest';
import { compile, sanitizeRerouteId, validateRecipe } from './compile';
import { reparse } from './reparse';
import type { Recipe } from './types';

// radial_gradient (sets d) → palette (sets col) → reroute_decl 'fog' (taps col)
// → reroute_use 'fog' (reads it back as a source).
const RECIPE_REROUTE: Recipe = {
  canvasAspect: 'square',
  cards: [
    { kind: 'typed', id: 'c0', type: 'radial_gradient', enabled: true, params: { softness: { value: 1, animation: null } } },
    {
      kind: 'typed', id: 'c1', type: 'palette', enabled: true,
      params: {
        color_a: { value: [0.07, 0.09, 0.14], animation: null },
        color_b: { value: [0.95, 0.55, 0.28], animation: null },
      },
    },
    { kind: 'typed', id: 'c2', type: 'reroute_decl', enabled: true, params: { name: { value: 'fog', animation: null } } },
    { kind: 'typed', id: 'c3', type: 'reroute_use', enabled: true, params: { ref: { value: 'fog', animation: null } } },
  ],
};

describe('named reroutes — compile', () => {
  it('pre-declares the rr_ var, taps col on declaration, reads it on usage', () => {
    const out = compile(RECIPE_REROUTE);
    expect(out.glsl).toContain('vec3 rr_fog = vec3(0.0);'); // top-of-main pre-decl
    expect(out.glsl).toContain('  rr_fog = col;'); // declaration body
    expect(out.glsl).toContain('  col = rr_fog;'); // usage body (source)
  });

  it('emits markers for both reroute cards (so reparse sees them as known)', () => {
    const out = compile(RECIPE_REROUTE);
    expect(out.glsl).toContain('//#card c2 Reroute');
    expect(out.glsl).toContain('//#card c3 Reroute (use)');
  });

  it('emits NO uniform for the text name param', () => {
    const out = compile(RECIPE_REROUTE);
    expect(out.glsl).not.toContain('u_card2_name');
    expect(out.glsl).not.toContain('u_card3_ref');
    expect(out.uniforms.find((u) => u.cardId === 'c2')).toBeUndefined();
    expect(out.uniforms.find((u) => u.cardId === 'c3')).toBeUndefined();
  });

  it('a usage with no matching declaration still pre-declares its var (reads zero, never errors)', () => {
    const recipe: Recipe = {
      canvasAspect: 'square',
      cards: [
        { kind: 'typed', id: 'c0', type: 'radial_gradient', enabled: true, params: { softness: { value: 1, animation: null } } },
        { kind: 'typed', id: 'c1', type: 'reroute_use', enabled: true, params: { ref: { value: 'ghost', animation: null } } },
      ],
    };
    const out = compile(recipe);
    expect(out.glsl).toContain('vec3 rr_ghost = vec3(0.0);'); // declared up front
    expect(out.glsl).toContain('  col = rr_ghost;'); // usage reads it
    expect(out.glsl).not.toContain('rr_ghost = col;'); // no declaration assigns it
  });

  it('sanitizes the name into a GLSL identifier suffix', () => {
    expect(sanitizeRerouteId('fog')).toBe('fog');
    expect(sanitizeRerouteId('My Route!')).toBe('My_Route_');
    expect(sanitizeRerouteId('')).toBe('unnamed');
    expect(sanitizeRerouteId('2nd')).toBe('2nd'); // prefixed rr_ later, so leading digit is fine
  });

  it('validateRecipe accepts reroute cards (registered types)', () => {
    expect(validateRecipe(RECIPE_REROUTE)).toEqual([]);
  });
});

describe('named reroutes — round trip', () => {
  it('reparse keeps reroute cards typed when source is unchanged (no wildcard drift)', () => {
    const compiled = compile(RECIPE_REROUTE);
    const res = reparse(RECIPE_REROUTE, compiled, compiled.glsl);
    expect(res.syntaxPending).toBe(false);
    expect(res.events).toEqual([]);
    expect(res.recipe.cards.map((c) => c.id)).toEqual(['c0', 'c1', 'c2', 'c3']);
    expect(res.recipe.cards[2]?.kind).toBe('typed');
    expect(res.recipe.cards[3]?.kind).toBe('typed');
  });
});
