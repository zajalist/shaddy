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

describe('composition (alpha + blend)', () => {
  const baseRecipe: Recipe = {
    canvasAspect: 'square',
    cards: [
      {
        kind: 'typed', id: 'c0', type: 'radial_gradient', enabled: true,
        params: { softness: { value: 1, animation: null } },
      },
      {
        kind: 'typed', id: 'c1', type: 'palette', enabled: true,
        params: {
          color_a: { value: [0.07, 0.09, 0.14], animation: null },
          color_b: { value: [0.95, 0.55, 0.28], animation: null },
        },
      },
    ],
  };

  it('default alpha+blend produces same GLSL as recipe without those fields', () => {
    const withDefaults: Recipe = {
      ...baseRecipe,
      cards: baseRecipe.cards.map((c) => ({ ...c, alpha: 1, blendMode: 'normal' as const })),
    };
    expect(compile(withDefaults).glsl).toBe(compile(baseRecipe).glsl);
  });

  it('wraps body in mix() composition when alpha < 1', () => {
    const recipe: Recipe = {
      ...baseRecipe,
      cards: [
        baseRecipe.cards[0]!,
        { ...baseRecipe.cards[1]!, alpha: 0.5 },
      ],
    };
    const out = compile(recipe);
    expect(out.glsl).toContain('vec3 _prev_col = col;');
    expect(out.glsl).toContain('float _prev_d = d;');
    expect(out.glsl).toContain('col = mix(_prev_col, _shadeBlend(_prev_col, col, 0), 0.5);');
    expect(out.glsl).toContain('d = mix(_prev_d, d, 0.5);');
  });

  it("uses additive blend code (mode=1) when blendMode='add'", () => {
    const recipe: Recipe = {
      ...baseRecipe,
      cards: [
        baseRecipe.cards[0]!,
        { ...baseRecipe.cards[1]!, blendMode: 'add' },
      ],
    };
    const out = compile(recipe);
    // Helper present + the mode literal `1` in this card's composition line.
    expect(out.glsl).toContain('vec3 _shadeBlend(vec3 base, vec3 over, int mode)');
    expect(out.glsl).toContain('return base + over;');
    expect(out.glsl).toMatch(/_shadeBlend\(_prev_col, col, 1\)/);
  });

  it('emits alpha + blend metadata on marker when non-default', () => {
    const recipe: Recipe = {
      canvasAspect: 'square',
      cards: [
        {
          kind: 'typed', id: 'c0', type: 'radial_gradient', enabled: true,
          params: { softness: { value: 1, animation: null } },
          alpha: 0.5, blendMode: 'add',
        },
      ],
    };
    const out = compile(recipe);
    expect(out.glsl).toMatch(/\/\/#card c0 Radial gradient .* @\{"alpha":0\.5,"blend":"add"\}/);
  });

  it('omits composition metadata when defaults', () => {
    const recipe: Recipe = {
      canvasAspect: 'square',
      cards: [
        {
          kind: 'typed', id: 'c0', type: 'radial_gradient', enabled: true,
          params: { softness: { value: 1, animation: null } },
          alpha: 1, blendMode: 'normal',
        },
      ],
    };
    const out = compile(recipe);
    expect(out.glsl).not.toContain('@{');
    expect(out.glsl).not.toContain('_shadeBlend');
  });

  it('omits blend helper when no card uses non-default composition', () => {
    const out = compile(baseRecipe);
    expect(out.glsl).not.toContain('_shadeBlend');
  });
});

describe('3D compile', () => {
  it('empty 3D recipe compiles to a far-plane scene (raymarcher misses, sky shows)', () => {
    const out = compile({ mode: '3d', canvasAspect: 'square', cards: [] });
    // No cards → no uniforms, no spans.
    expect(out.spans).toEqual([]);
    expect(out.uniforms).toEqual([]);
    // Scene has the raymarch boilerplate + a far-plane default + sky colour.
    expect(out.glsl).toContain('float sdScene(vec3 p)');
    expect(out.glsl).toContain('float d = 1e9;');
    expect(out.glsl).toContain('void main() {');
    expect(out.glsl).toContain('vec3 col = vec3(0.15, 0.18, 0.25);');
    expect(out.glsl).toContain('fragColor = vec4(col, 1.0);');
    expect(out.glsl).toContain(END_MARKER);
  });

  it('single sphere_3d compiles + emits a non-trivial raymarched scene', () => {
    const out = compile({
      mode: '3d',
      canvasAspect: 'square',
      cards: [{
        kind: 'typed', id: 's0', type: 'sphere_3d', enabled: true,
        params: {
          r:  { value: 0.6, animation: null },
          cx: { value: 0,   animation: null },
          cy: { value: 0.6, animation: null },
          cz: { value: 0,   animation: null },
        },
      }],
    });
    // Sphere uniforms emitted.
    expect(out.glsl).toContain('uniform float u_card0_r;');
    expect(out.glsl).toContain('uniform float u_card0_cx;');
    expect(out.glsl).toContain('uniform float u_card0_cy;');
    expect(out.glsl).toContain('uniform float u_card0_cz;');
    // Sphere SDF contribution wired into sdScene via sdSmoothMin.
    expect(out.glsl).toContain('sdSmoothMin(d, length(p - vec3(u_card0_cx, u_card0_cy, u_card0_cz)) - u_card0_r, k);');
    // Raymarch helpers present.
    expect(out.glsl).toContain('float sdSmoothMin(float a, float b, float k)');
    expect(out.glsl).toContain('vec3 sceneNormal3(vec3 p)');
    expect(out.glsl).toContain('float softShadow3(vec3 ro, vec3 rd, float mint, float maxt, float w)');
    // Span covers the sphere card.
    expect(out.spans).toHaveLength(1);
    expect(out.spans[0]?.cardId).toBe('s0');
  });

  it('two spheres + smooth_union_3d produces a smoothMin call with k > 0', () => {
    const out = compile({
      mode: '3d',
      canvasAspect: 'square',
      cards: [
        {
          kind: 'typed', id: 's0', type: 'sphere_3d', enabled: true,
          params: {
            r:  { value: 0.5, animation: null },
            cx: { value: -0.4, animation: null },
            cy: { value: 0.6, animation: null },
            cz: { value: 0, animation: null },
          },
        },
        {
          kind: 'typed', id: 'k0', type: 'smooth_union_3d', enabled: true,
          params: { k: { value: 0.3, animation: null } },
        },
        {
          kind: 'typed', id: 's1', type: 'sphere_3d', enabled: true,
          params: {
            r:  { value: 0.5, animation: null },
            cx: { value: 0.4, animation: null },
            cy: { value: 0.6, animation: null },
            cz: { value: 0, animation: null },
          },
        },
      ],
    });
    // Smoothness card updates `k` before the second sphere's union.
    expect(out.glsl).toContain('k = u_card1_k;');
    // Both sphere unions are emitted via sdSmoothMin.
    const smoothMinCalls = out.glsl.match(/sdSmoothMin\(d, /g) ?? [];
    expect(smoothMinCalls.length).toBe(2);
    // 3 spans — sphere, smoothness, sphere.
    expect(out.spans).toHaveLength(3);
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
