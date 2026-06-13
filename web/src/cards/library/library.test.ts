import { describe, expect, it } from 'vitest';
import {
  CARD_LIBRARY,
  CARD_LIBRARY_LIST,
  HELPERS,
  orderedHelpers,
  PORTAL,
  lookupCardDef,
  resolveHelperClosure,
} from './index';

// Params the compiler consumes at build time that are deliberately NOT
// referenced by the card's snippet (they steer code generation, not GLSL).
const COMPILE_ONLY_PARAMS: Record<string, Set<string>> = {
  repeat: new Set(['scope']),
  reroute_decl: new Set(['channel']),
  reroute_use: new Set(['channel']),
};

describe('CARD_LIBRARY', () => {
  it('ships a deep typed catalog covering all four categories', () => {
    // Floor only — adding cards shouldn't break this test. Tighten if a card
    // category gets accidentally pruned.
    expect(CARD_LIBRARY_LIST.length).toBeGreaterThanOrEqual(80);
    const cats = new Set(CARD_LIBRARY_LIST.map((c) => c.category));
    expect(cats).toEqual(new Set(['shape', 'distortion', 'color', 'effect']));
  });

  it('each category has at least 10 cards', () => {
    const byCat: Record<string, number> = {};
    for (const c of CARD_LIBRARY_LIST) byCat[c.category] = (byCat[c.category] ?? 0) + 1;
    for (const n of Object.values(byCat)) expect(n).toBeGreaterThanOrEqual(10);
  });

  it('has unique types', () => {
    const types = CARD_LIBRARY_LIST.map((c) => c.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('every card has a non-empty snippet; cards with params include at least one {{placeholder}}', () => {
    // Zero-param marker cards (e.g. PORTAL) intentionally have no
    // placeholders — they still need a non-empty snippet so the compiler's
    // span machinery has a body line to attribute. Cards with params must
    // reference at least one of them so authoring mistakes (a uniform that
    // never gets wired up) surface here.
    for (const c of CARD_LIBRARY_LIST) {
      expect(c.snippetTemplate.trim().length).toBeGreaterThan(0);
      if (Object.keys(c.params).length > 0) {
        expect(c.snippetTemplate).toMatch(/\{\{[a-z_][a-z0-9_]*\}\}/i);
      }
    }
  });

  it("every snippet's {{placeholders}} match the card's declared params", () => {
    for (const c of CARD_LIBRARY_LIST) {
      const placeholders = Array.from(c.snippetTemplate.matchAll(/\{\{([a-z_][a-z0-9_]*)\}\}/gi)).map(
        (m) => m[1],
      );
      const declared = new Set(Object.keys(c.params));
      for (const p of placeholders) {
        expect(declared.has(p as string)).toBe(true);
      }
      // Compile-only params are read by the compiler at build time and are
      // intentionally absent from the snippet (e.g. Repeat's `scope` chooses
      // the tiling reach, never appears in GLSL).
      const compileOnly = COMPILE_ONLY_PARAMS[c.type] ?? new Set<string>();
      // Every declared param must be referenced at least once.
      for (const d of declared) {
        if (compileOnly.has(d)) continue;
        expect(placeholders.includes(d)).toBe(true);
      }
    }
  });

  it('PORTAL is registered as a zero-param marker card with a non-empty snippet', () => {
    expect(PORTAL.type).toBe('portal');
    expect(Object.keys(PORTAL.params).length).toBe(0);
    expect(PORTAL.snippetTemplate.length).toBeGreaterThan(0);
    expect(lookupCardDef('portal')).toBe(PORTAL);
  });

  it('CARD_LIBRARY map keys match each card.type', () => {
    for (const c of CARD_LIBRARY_LIST) {
      expect(CARD_LIBRARY[c.type]).toBe(c);
    }
  });

  it('lookupCardDef returns null for unknown types', () => {
    expect(lookupCardDef('nope')).toBeNull();
    expect(lookupCardDef('radial_gradient')).not.toBeNull();
  });

  it('every declared helper name exists in HELPERS', () => {
    for (const c of CARD_LIBRARY_LIST) {
      for (const h of c.helpers ?? []) {
        expect(HELPERS).toHaveProperty(h);
      }
    }
  });
});

describe('helpers', () => {
  it('every HELPERS entry has a non-empty body and only references existing deps', () => {
    for (const [name, def] of Object.entries(HELPERS)) {
      expect(def.body.length, name).toBeGreaterThan(0);
      for (const d of def.deps) expect(HELPERS, `${name} -> ${d}`).toHaveProperty(d);
      expect(['pre', 'post']).toContain(def.phase);
    }
  });

  it('resolveHelperClosure pulls in transitive dependencies', () => {
    // noise2 depends on hash21.
    const closure = resolveHelperClosure(['noise2']);
    expect(closure.has('noise2')).toBe(true);
    expect(closure.has('hash21')).toBe(true);
  });

  it('resolveHelperClosure ignores unknown names', () => {
    const closure = resolveHelperClosure(['no-such-helper', 'hash21']);
    expect(closure.has('hash21')).toBe(true);
    expect(closure.has('no-such-helper')).toBe(false);
  });

  it('orderedHelpers emits EVERY requested helper (no silent drop) with deps first', () => {
    // The old failure mode: a helper present in the registry but missing from a
    // hand-kept order list was silently never emitted. Order is now derived, so
    // the closure and the emitted set are always equal.
    const closure = resolveHelperClosure(['fbm2', 'worley2', 'softShadow3']);
    const emitted = orderedHelpers(closure);
    expect(new Set(emitted.map((h) => h.name))).toEqual(closure);
    // A dependency always precedes its dependent.
    const pos = (n: string) => emitted.findIndex((h) => h.name === n);
    expect(pos('hash21')).toBeLessThan(pos('noise2'));
    expect(pos('noise2')).toBeLessThan(pos('fbm2'));
    // 'post' helpers are tagged so the 3D compiler can split around sdScene.
    expect(emitted.find((h) => h.name === 'softShadow3')?.phase).toBe('post');
  });
});
