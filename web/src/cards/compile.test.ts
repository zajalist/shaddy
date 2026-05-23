import { describe, expect, it } from 'vitest';
import { compile, uniformNameFor, validateRecipe } from './compile';
import { END_MARKER, MARKER_PREFIX } from './markers';
import type { Recipe } from './types';

const RECIPE_RGV: Recipe = {
  canvasAspect: 'square',
  cards: [
    {
      kind: 'typed',
      id: 'c0',
      type: 'radial_gradient',
      enabled: true,
      params: { softness: { value: 1, animation: null } },
    },
    {
      kind: 'typed',
      id: 'c1',
      type: 'palette',
      enabled: true,
      params: {
        color_a: { value: [0.07, 0.09, 0.14], animation: null },
        color_b: { value: [0.95, 0.55, 0.28], animation: null },
      },
    },
  ],
};

describe('compile', () => {
  it('emits per-card uniform declarations in card order', () => {
    const out = compile(RECIPE_RGV);
    expect(out.glsl).toContain('uniform float u_card0_softness;');
    expect(out.glsl).toContain('uniform vec3 u_card1_color_a;');
    expect(out.glsl).toContain('uniform vec3 u_card1_color_b;');
  });

  it('returns UniformBinding entries that match emitted decls', () => {
    const out = compile(RECIPE_RGV);
    const names = out.uniforms.map((u) => u.name);
    expect(names).toEqual(['u_card0_softness', 'u_card1_color_a', 'u_card1_color_b']);
    expect(out.uniforms[0]).toMatchObject({ cardId: 'c0', paramKey: 'softness', value: 1 });
  });

  it('substitutes {{param}} placeholders with uniform refs in the snippet', () => {
    const out = compile(RECIPE_RGV);
    expect(out.glsl).toContain('d = 1.0 - clamp(length(uv) * u_card0_softness, 0.0, 1.0);');
    expect(out.glsl).toContain(
      'col = mix(u_card1_color_a, u_card1_color_b, clamp(d, 0.0, 1.0));',
    );
  });

  it('emits //#card markers + //#end terminator', () => {
    const out = compile(RECIPE_RGV);
    expect(out.glsl).toContain(`${MARKER_PREFIX} c0 Radial gradient { softness:1 }`);
    expect(out.glsl).toContain(`${MARKER_PREFIX} c1 Palette { color_a:#121724, color_b:#f28c47 }`);
    expect(out.glsl).toContain(END_MARKER);
  });

  it('produces one Span per card with 1-based line ranges', () => {
    const out = compile(RECIPE_RGV);
    expect(out.spans.length).toBe(2);

    // Verify each span's startLine actually IS a //#card marker line.
    const lines = out.glsl.split('\n');
    for (const span of out.spans) {
      expect(lines[span.startLine - 1]?.trimStart().startsWith(MARKER_PREFIX)).toBe(true);
      expect(span.endLine).toBeGreaterThanOrEqual(span.startLine);
    }
  });

  it("span.expectedBody slices match the emitted body lines verbatim", () => {
    const out = compile(RECIPE_RGV);
    const lines = out.glsl.split('\n');
    for (const span of out.spans) {
      const sliced = lines.slice(span.startLine, span.endLine).join('\n');
      expect(span.expectedBody).toBe(sliced);
    }
  });

  it('emits wildcard rawSource verbatim between markers', () => {
    const recipe: Recipe = {
      canvasAspect: 'square',
      cards: [
        {
          kind: 'wildcard',
          id: 'w0',
          enabled: true,
          rawSource: '  d = 0.5;\n  d += noise(uv) * 0.1;',
          displayName: 'fancy distortion',
        },
      ],
    };
    const out = compile(recipe);
    expect(out.glsl).toContain(`${MARKER_PREFIX} w0 fancy distortion`);
    expect(out.glsl).toContain('  d = 0.5;');
    expect(out.glsl).toContain('  d += noise(uv) * 0.1;');
  });

  it('emits a complete shader body with empty recipe', () => {
    const out = compile({ canvasAspect: 'square', cards: [] });
    expect(out.spans).toEqual([]);
    expect(out.uniforms).toEqual([]);
    expect(out.glsl).toContain('void main() {');
    expect(out.glsl).toContain(END_MARKER);
    expect(out.glsl).toContain('fragColor = vec4(col, 1.0);');
  });

  it('is deterministic: same recipe → byte-identical glsl', () => {
    expect(compile(RECIPE_RGV).glsl).toBe(compile(RECIPE_RGV).glsl);
  });
});

describe('uniformNameFor', () => {
  it('produces the canonical name shape', () => {
    expect(uniformNameFor(0, 'softness')).toBe('u_card0_softness');
    expect(uniformNameFor(3, 'color_a')).toBe('u_card3_color_a');
  });
});

describe('helper emission', () => {
  it('emits transitive helpers (noise_field requires hash21 via noise2)', () => {
    const recipe: Recipe = {
      canvasAspect: 'square',
      cards: [
        {
          kind: 'typed',
          id: 'n0',
          type: 'noise_field',
          enabled: true,
          params: { scale: { value: 4, animation: null } },
        },
      ],
    };
    const out = compile(recipe);
    expect(out.glsl).toContain('// === helpers ===');
    expect(out.glsl).toContain('float noise2(vec2 p)');
    expect(out.glsl).toContain('float hash21(vec2 p)');
    // hash21 must appear BEFORE noise2 (dependency order).
    expect(out.glsl.indexOf('float hash21')).toBeLessThan(out.glsl.indexOf('float noise2'));
  });

  it('emits each helper exactly once even when multiple cards reference it', () => {
    const recipe: Recipe = {
      canvasAspect: 'square',
      cards: [
        {
          kind: 'typed',
          id: 'g0',
          type: 'grain',
          enabled: true,
          params: { amount: { value: 0.05, animation: null } },
        },
        {
          kind: 'typed',
          id: 'g1',
          type: 'grain',
          enabled: true,
          params: { amount: { value: 0.1, animation: null } },
        },
      ],
    };
    const out = compile(recipe);
    const occurrences = out.glsl.split('float hash21').length - 1;
    expect(occurrences).toBe(1);
  });

  it('omits the helpers block when no card needs helpers', () => {
    const recipe: Recipe = {
      canvasAspect: 'square',
      cards: [
        {
          kind: 'typed',
          id: 'c0',
          type: 'radial_gradient',
          enabled: true,
          params: { softness: { value: 1, animation: null } },
        },
      ],
    };
    const out = compile(recipe);
    expect(out.glsl).not.toContain('// === helpers ===');
  });
});

describe('validateRecipe', () => {
  it('returns empty when all cards are known', () => {
    expect(validateRecipe(RECIPE_RGV)).toEqual([]);
  });

  it('flags unknown card types', () => {
    const bad: Recipe = {
      canvasAspect: 'square',
      cards: [
        { kind: 'typed', id: 'x', type: 'no_such_card', enabled: true, params: {} },
      ],
    };
    expect(validateRecipe(bad)).toEqual(['unknown card type: no_such_card']);
  });
});
