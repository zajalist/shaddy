import { describe, expect, it } from 'vitest';
import { SHADE } from '../../tokens';
import { inkCard, INK_SHADOW, INK_BORDER, INK_RADIUS } from './style';

describe('library/style — inkCard', () => {
  it('produces the FLAT hard-offset shadow (no glow/blur)', () => {
    const card = inkCard();
    expect(card.boxShadow).toBe(`0 3px 0 ${SHADE.inkLine}`);
    // Guard against an accidental blur radius / spread creeping in: a flat
    // hard-offset shadow has exactly two length values before the colour.
    expect(card.boxShadow).not.toMatch(/blur|inset/);
    // "0 3px 0 #color" → offset-x, offset-y, blur=0. No 4th length (spread).
    expect(String(card.boxShadow).split(' ').length).toBe(4);
  });

  it('uses the 1.5px solid ink border and 10px radius', () => {
    const card = inkCard();
    expect(card.border).toBe(`1.5px solid ${SHADE.inkLine}`);
    expect(card.borderRadius).toBe(10);
    expect(card.background).toBe(SHADE.surface1);
  });

  it('merges overrides over the base recipe', () => {
    const card = inkCard({ borderRadius: 8, padding: 14 });
    expect(card.borderRadius).toBe(8);
    expect(card.padding).toBe(14);
    expect(card.boxShadow).toBe(INK_SHADOW);
  });

  it('exposes consistent constants', () => {
    expect(INK_BORDER).toBe(`1.5px solid ${SHADE.inkLine}`);
    expect(INK_RADIUS).toBe(10);
  });

  it('matches a stable snapshot', () => {
    expect(inkCard()).toMatchSnapshot();
  });
});
