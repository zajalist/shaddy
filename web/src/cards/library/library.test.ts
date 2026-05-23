import { describe, expect, it } from 'vitest';
import { CARD_LIBRARY, CARD_LIBRARY_LIST, lookupCardDef } from './index';

describe('CARD_LIBRARY', () => {
  it('ships 4 typed cards covering all four categories', () => {
    expect(CARD_LIBRARY_LIST.length).toBe(4);
    const cats = new Set(CARD_LIBRARY_LIST.map((c) => c.category));
    expect(cats).toEqual(new Set(['shape', 'distortion', 'color', 'effect']));
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
});
