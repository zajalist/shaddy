import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import { END_MARKER } from './markers';
import { extractDisplayName, normalizeGlsl, reparse } from './reparse';
import type { Recipe } from './types';

const RECIPE_RP: Recipe = {
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

describe('normalizeGlsl', () => {
  it('strips line comments + block comments + collapses whitespace', () => {
    expect(normalizeGlsl('  d = 1.0;  // tail comment\n  /* block */ d *= 2.0;\n')).toBe(
      'd = 1.0; d *= 2.0;',
    );
  });

  it('treats a noisy comment-only edit as equivalent to the bare body', () => {
    const a = 'd = sin(d * u_card1_frequency);';
    const b = '  // hand-tuned\n  d = sin(d * u_card1_frequency); // ripple step\n';
    expect(normalizeGlsl(a)).toBe(normalizeGlsl(b));
  });
});

describe('extractDisplayName', () => {
  it('returns the first line-comment text when present', () => {
    expect(extractDisplayName('// fancy distortion\nd += noise(uv);')).toBe('fancy distortion');
  });

  it('returns null when the first non-empty line is code', () => {
    expect(extractDisplayName('d += noise(uv);\n// not me')).toBeNull();
  });

  it('returns null on empty body', () => {
    expect(extractDisplayName('')).toBeNull();
    expect(extractDisplayName('\n\n  \n')).toBeNull();
  });

  it('ignores leading whitespace', () => {
    expect(extractDisplayName('   // hello world\n')).toBe('hello world');
  });
});

describe('reparse', () => {
  it('reports unchanged when the source is identical to compile output', () => {
    const compiled = compile(RECIPE_RP);
    const res = reparse(RECIPE_RP, compiled, compiled.glsl);
    expect(res.syntaxPending).toBe(false);
    expect(res.events).toEqual([]);
    // Recipe shape preserved.
    expect(res.recipe.cards.map((c) => c.id)).toEqual(['c0', 'c1']);
    expect(res.recipe.cards[0]?.kind).toBe('typed');
  });

  it('reports unchanged when the user only added comments / whitespace in a span', () => {
    const compiled = compile(RECIPE_RP);
    const noisy = compiled.glsl.replace(
      'd = 1.0 - clamp(length(uv) * u_card0_softness, 0.0, 1.0);',
      '  // hand-tuned\n  d = 1.0 - clamp(length(uv) * u_card0_softness, 0.0, 1.0); // gradient',
    );
    const res = reparse(RECIPE_RP, compiled, noisy);
    expect(res.syntaxPending).toBe(false);
    expect(res.events).toEqual([]);
    expect(res.recipe.cards[0]?.kind).toBe('typed');
  });

  it('converts a typed card to a wildcard when its body is structurally edited', () => {
    const compiled = compile(RECIPE_RP);
    // Add a meaningful structural change inside c0's body.
    const broken = compiled.glsl.replace(
      'd = 1.0 - clamp(length(uv) * u_card0_softness, 0.0, 1.0);',
      'd = 1.0 - clamp(length(uv) * u_card0_softness, 0.0, 1.0);\n  d *= 0.5;',
    );
    const res = reparse(RECIPE_RP, compiled, broken);
    expect(res.syntaxPending).toBe(false);
    expect(res.events.length).toBe(1);
    expect(res.events[0]).toMatchObject({ kind: 'card-became-wildcard', cardId: 'c0' });
    expect(res.recipe.cards[0]?.kind).toBe('wildcard');
    expect(res.recipe.cards[1]?.kind).toBe('typed'); // c1 untouched
  });

  it("captures user's body as the wildcard's rawSource", () => {
    const compiled = compile(RECIPE_RP);
    const broken = compiled.glsl.replace(
      'd = 1.0 - clamp(length(uv) * u_card0_softness, 0.0, 1.0);',
      '  // overridden\n  d = 0.42;',
    );
    const res = reparse(RECIPE_RP, compiled, broken);
    const wildcard = res.recipe.cards[0];
    if (wildcard?.kind !== 'wildcard') throw new Error('expected wildcard');
    expect(wildcard.rawSource).toContain('d = 0.42;');
    expect(wildcard.displayName).toBe('overridden');
  });

  it('returns syntaxPending when the //#end marker has been removed', () => {
    const compiled = compile(RECIPE_RP);
    const broken = compiled.glsl.replace(END_MARKER, '// (end removed)');
    const res = reparse(RECIPE_RP, compiled, broken);
    expect(res.syntaxPending).toBe(true);
    expect(res.events).toEqual([]);
    // Recipe preserved unchanged.
    expect(res.recipe).toBe(RECIPE_RP);
  });

  it('returns syntaxPending when the marker count differs from the recipe', () => {
    const compiled = compile(RECIPE_RP);
    // Strip the c1 marker line.
    const broken = compiled.glsl
      .split('\n')
      .filter((l) => !l.includes('c1 Palette'))
      .join('\n');
    const res = reparse(RECIPE_RP, compiled, broken);
    expect(res.syntaxPending).toBe(true);
  });

  it('updates rawSource (and displayName) on a wildcard body edit', () => {
    const wildcardRecipe: Recipe = {
      canvasAspect: 'square',
      cards: [
        {
          kind: 'wildcard',
          id: 'w0',
          enabled: true,
          rawSource: '  d = 0.5;',
          displayName: null,
        },
      ],
    };
    const compiled = compile(wildcardRecipe);
    const edited = compiled.glsl.replace('  d = 0.5;', '  // new tag\n  d = 0.7;');
    const res = reparse(wildcardRecipe, compiled, edited);
    expect(res.syntaxPending).toBe(false);
    expect(res.events.length).toBe(1);
    expect(res.events[0]).toMatchObject({ kind: 'wildcard-updated', cardId: 'w0' });
    const updated = res.recipe.cards[0];
    if (updated?.kind !== 'wildcard') throw new Error('expected wildcard');
    expect(updated.rawSource).toContain('d = 0.7;');
    expect(updated.displayName).toBe('new tag');
  });
});
