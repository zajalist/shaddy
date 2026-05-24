import { describe, expect, it } from 'vitest';
import { makeDefaultBlock, validateRecipe } from './default-block';
import type { Recipe } from './types';

describe('makeDefaultBlock', () => {
  it('returns a Block with default param values and fresh id', () => {
    const b = makeDefaultBlock('ripple');
    expect(b.type).toBe('ripple');
    expect(b.enabled).toBe(true);
    expect(b.params.freq?.value).toBe(10);
    expect(b.params.phase?.value).toBe(0);
    expect(b.id.length).toBeGreaterThan(0);
  });

  it('two calls produce distinct ids', () => {
    expect(makeDefaultBlock('ripple').id).not.toBe(makeDefaultBlock('ripple').id);
  });

  it('throws on unknown type (programming error — not a runtime case)', () => {
    expect(() => makeDefaultBlock('no_such')).toThrow();
  });
});

describe('validateRecipe', () => {
  it('returns ok for a sound recipe', () => {
    const r: Recipe = {
      version: 1,
      blocks: [makeDefaultBlock('ripple')],
      globalTempo: 120,
      canvasAspect: 'square',
    };
    expect(validateRecipe(r).ok).toBe(true);
  });

  it('returns errors for an unknown block type', () => {
    const r: Recipe = {
      version: 1,
      blocks: [{ id: 'x', type: 'nope', enabled: true, params: {} }],
      globalTempo: 120,
      canvasAspect: 'square',
    };
    const res = validateRecipe(r);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected fail');
    expect(res.errors[0]!.code).toBe('unknown_block_type');
  });
});
