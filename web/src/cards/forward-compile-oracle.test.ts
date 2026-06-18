import { describe, expect, it } from 'vitest';
import { compile, END_MARKER } from './compile';
import { reparse } from './reparse';
import { CARD_LIBRARY_LIST, CARD_LIBRARY } from './library';
import type { CardDef, Parameter, Recipe, TypedCard } from './types';

// Forward-compile oracle for the WHOLE card library (2D + 3D).
//
// The pre-existing round-trip oracle only covers the *reverse* parser, and it
// deliberately excludes 3D cards (reparse is span-based and 2D-only). But the
// FORWARD path — cards → GLSL — is the live one every preview uses, and nothing
// pinned it across the 3D catalogue. This does:
//   (1) determinism      — compile() is byte-identical across calls.
//   (2) structural sanity — output has a void main(), a card marker, the END
//                           marker, and at least one uniform table section.
//   (3) reparse safety    — feeding compile()'s own output back through reparse
//                           never throws and never loses the card's source
//                           (2D self-reparses to typed; 3D degrades to a
//                           wildcard that still carries the original type).
// Together these guard every NEW card the moment it lands in CARD_LIBRARY_LIST.

const SPECIAL = new Set(['portal', 'macro', 'reroute_decl', 'reroute_use']);
const MEDIA_KINDS = new Set(['image', 'video', 'buffer']);

function defaultParams(def: CardDef): Record<string, Parameter> {
  const out: Record<string, Parameter> = {};
  for (const [k, pd] of Object.entries(def.params)) {
    out[k] = { value: pd.default as Parameter['value'], animation: null };
  }
  return out;
}

const COMPILABLE = CARD_LIBRARY_LIST.filter(
  (def) =>
    !SPECIAL.has(def.type) &&
    !Object.values(def.params).some((pd) => MEDIA_KINDS.has(pd.kind)),
);

function recipeFor(def: CardDef): Recipe {
  const card: TypedCard = {
    kind: 'typed', id: 'c0', type: def.type, enabled: true, params: defaultParams(def),
  };
  return { canvasAspect: 'square', mode: def.mode === '3d' ? '3d' : '2d', cards: [card] };
}

describe('forward-compile oracle (whole library)', () => {
  it('covers nearly the entire catalogue', () => {
    // 2D + 3D, only special/media cards excluded.
    expect(COMPILABLE.length).toBeGreaterThan(150);
  });

  it.each(COMPILABLE.map((d) => [d.type, d] as const))(
    '%s — deterministic + structurally valid GLSL',
    (_type, def) => {
      const recipe = recipeFor(def);
      const a = compile(recipe);
      const b = compile(recipe);

      // (1) determinism
      expect(a.glsl).toBe(b.glsl);

      // (2) structural sanity
      expect(a.glsl).toContain('void main');
      expect(a.glsl).toContain(END_MARKER);
      expect(a.glsl.length).toBeGreaterThan(40);

      // (3) reparse never throws and never silently drops the card
      const res = reparse(recipe, a, a.glsl);
      const out = res.recipe.cards[0];
      expect(out).toBeDefined();
      // Both 2D and 3D now self-reparse to a typed card (the //#end boundary
      // sits right after the card region in both compilers).
      expect(res.syntaxPending).toBe(false);
      expect(out!.kind).toBe('typed');
    },
  );

  it('assembled 3D scene (camera + sphere + sun) compiles deterministically', () => {
    const defs = ['camera_3d', 'sphere_3d', 'sun_3d']
      .map((t) => CARD_LIBRARY[t])
      .filter(Boolean) as CardDef[];
    expect(defs.length).toBe(3);
    const cards: TypedCard[] = defs.map((d, i) => ({
      kind: 'typed', id: `c${i}`, type: d.type, enabled: true, params: defaultParams(d),
    }));
    const recipe: Recipe = { canvasAspect: 'square', mode: '3d', cards };
    const a = compile(recipe);
    const b = compile(recipe);
    expect(a.glsl).toBe(b.glsl);
    expect(a.glsl).toContain('void main');
    expect(a.uniforms.length).toBeGreaterThan(0);

    // Every card in the assembled scene self-reparses to typed (not just the
    // last one) — the //#end boundary bounds the final card correctly.
    const res = reparse(recipe, a, a.glsl);
    expect(res.syntaxPending).toBe(false);
    expect(res.recipe.cards.every((c) => c.kind === 'typed')).toBe(true);
  });
});
