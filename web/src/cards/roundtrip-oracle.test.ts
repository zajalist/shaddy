import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import { reparse } from './reparse';
import { CARD_LIBRARY_LIST } from './library';
import type { CardDef, Parameter, Recipe, TypedCard } from './types';

// Library-wide round-trip oracle. The reverse parser silently degrades a card
// to a wildcard if compile() ever drifts or its own output fails to self-match
// — and nothing in CI pinned that across the catalog. This does:
//   (1) determinism — compile() of a card is byte-identical across calls.
//   (2) self-reparse fixed point — reparse(recipe, compiled, compiled.glsl)
//       returns syntaxPending:false and does NOT turn any untouched card into
//       a wildcard on its own output.
// (Corrected form of the compiler-review "recipeequal-ci-oracle" proposal —
// uses the LIVE stack, not the parked bidi/DAG which can't lower these bodies.)

const SPECIAL = new Set(['portal', 'macro', 'reroute_decl', 'reroute_use']);
const MEDIA_KINDS = new Set(['image', 'video', 'buffer']);

function defaultParams(def: CardDef): Record<string, Parameter> {
  const out: Record<string, Parameter> = {};
  for (const [k, pd] of Object.entries(def.params)) {
    out[k] = { value: pd.default as Parameter['value'], animation: null };
  }
  return out;
}

// Cards that compile to a real body we can round-trip: 2D, non-special, and
// no media/sampler params (those need live texture state, not a literal).
const ROUNDTRIPPABLE = CARD_LIBRARY_LIST.filter((def) =>
  def.mode !== '3d'
  && !SPECIAL.has(def.type)
  && !Object.values(def.params).some((pd) => MEDIA_KINDS.has(pd.kind)),
);

describe('round-trip oracle (live card library)', () => {
  it('covers a substantial slice of the library', () => {
    expect(ROUNDTRIPPABLE.length).toBeGreaterThan(60);
  });

  it.each(ROUNDTRIPPABLE.map((d) => [d.type, d] as const))(
    '%s — deterministic + self-reparse fixed point',
    (_type, def) => {
      const card: TypedCard = { kind: 'typed', id: 'c0', type: def.type, enabled: true, params: defaultParams(def) };
      const recipe: Recipe = { canvasAspect: 'square', cards: [card] };

      // (1) determinism
      const a = compile(recipe);
      const b = compile(recipe);
      expect(a.glsl).toBe(b.glsl);

      // (2) self-reparse fixed point — feeding compile's own output back in
      // must not drift the card to a wildcard.
      const res = reparse(recipe, a, a.glsl);
      expect(res.syntaxPending).toBe(false);
      expect(res.recipe.cards[0]?.kind).toBe('typed');
    },
  );
});
