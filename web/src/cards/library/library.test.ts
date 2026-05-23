import { describe, expect, it } from 'vitest';
import {
  CARD_LIBRARY,
  CARD_LIBRARY_LIST,
  GLSL_HELPERS,
  HELPER_EMISSION_ORDER,
  lookupCardDef,
  resolveHelperClosure,
} from './index';

describe('CARD_LIBRARY', () => {
  it('ships 25 typed cards covering all four categories', () => {
    expect(CARD_LIBRARY_LIST.length).toBe(25);
    const cats = new Set(CARD_LIBRARY_LIST.map((c) => c.category));
    expect(cats).toEqual(new Set(['shape', 'distortion', 'color', 'effect']));
  });

  it('each category has at least 5 cards', () => {
    const byCat: Record<string, number> = {};
    for (const c of CARD_LIBRARY_LIST) byCat[c.category] = (byCat[c.category] ?? 0) + 1;
    for (const n of Object.values(byCat)) expect(n).toBeGreaterThanOrEqual(5);
  });

  it('has unique types', () => {
    const types = CARD_LIBRARY_LIST.map((c) => c.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('every card has a non-empty snippet with at least one {{param}} placeholder', () => {
    for (const c of CARD_LIBRARY_LIST) {
      expect(c.snippetTemplate.trim().length).toBeGreaterThan(0);
      expect(c.snippetTemplate).toMatch(/\{\{[a-z_][a-z0-9_]*\}\}/i);
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
      // Every declared param must be referenced at least once.
      for (const d of declared) {
        expect(placeholders.includes(d)).toBe(true);
      }
    }
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

  it('every declared helper name exists in GLSL_HELPERS', () => {
    for (const c of CARD_LIBRARY_LIST) {
      for (const h of c.helpers ?? []) {
        expect(GLSL_HELPERS).toHaveProperty(h);
      }
    }
  });
});

describe('helpers', () => {
  it('every helper in HELPER_EMISSION_ORDER exists in GLSL_HELPERS', () => {
    for (const name of HELPER_EMISSION_ORDER) {
      expect(GLSL_HELPERS).toHaveProperty(name);
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
});
