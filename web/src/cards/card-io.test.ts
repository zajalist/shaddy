import { describe, expect, it } from 'vitest';
import { cardIO } from './compile';
import { CARD_LIBRARY_LIST } from './library';
import type { CardDef, Register } from './types';

// CardDef now carries an explicit (or category-derived) IO contract — the
// single authority for which pipeline registers a card touches, replacing the
// `category === 'shape'` inference the compiler used for Repeat tiling.
// See improve-codebase-architecture #5.
const VALID: ReadonlySet<Register> = new Set(['uv', 'd', 'col']);

describe('cardIO — register contract', () => {
  it('derives sensible defaults from category', () => {
    const io = (cat: CardDef['category']): { reads: readonly Register[]; writes: readonly Register[] } =>
      cardIO({ type: 't', category: cat, friendlyName: '', description: '', icon: '', params: {}, snippetTemplate: '' });
    expect(io('shape').writes).toContain('d');
    expect(io('color').writes).toContain('col');
    expect(io('distortion').writes).toContain('uv');
    expect(io('effect').writes).toContain('col');
  });

  it('an explicit io overrides the category default', () => {
    const def: CardDef = { type: 't', category: 'distortion', friendlyName: '', description: '', icon: '', params: {}, snippetTemplate: '', io: { reads: ['uv', 'd'], writes: ['d'] } };
    expect(cardIO(def).writes).toEqual(['d']); // not the distortion default ['uv']
  });

  it('every library card resolves to a valid IO contract', () => {
    for (const def of CARD_LIBRARY_LIST) {
      const io = cardIO(def);
      for (const r of io.reads) expect(VALID.has(r), `${def.type} reads ${r}`).toBe(true);
      for (const w of io.writes) expect(VALID.has(w), `${def.type} writes ${w}`).toBe(true);
    }
  });

  it('Repeat tiling targets cards that write d (= shapes today)', () => {
    // The compiler asks writesDistance via cardIO; sanity-check the proxy holds.
    const shapes = CARD_LIBRARY_LIST.filter((d) => d.category === 'shape' && d.mode !== '3d');
    for (const s of shapes) expect(cardIO(s).writes).toContain('d');
  });
});
