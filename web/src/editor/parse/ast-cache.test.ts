import { describe, expect, it, vi } from 'vitest';

import { AstCache } from './ast-cache';

describe('AstCache', () => {
  const EMPTY = Object.freeze({ type: 'empty' });

  it('returns same reference for same input', () => {
    const parse = vi.fn((src: string) => ({ src }));
    const cache = new AstCache<{ src: string } | typeof EMPTY>(parse, EMPTY);
    const a = cache.get('void main() {}');
    const b = cache.get('void main() {}');
    expect(a).toBe(b);
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it('returns empty sentinel on parse failure', () => {
    const parse = vi.fn(() => null);
    const cache = new AstCache<unknown>(parse, EMPTY);
    expect(cache.get('garbage')).toBe(EMPTY);
  });

  it('does not throw when parser throws', () => {
    const parse = vi.fn(() => {
      throw new Error('boom');
    });
    const cache = new AstCache<unknown>(parse, EMPTY);
    expect(() => cache.get('x')).not.toThrow();
    expect(cache.get('x')).toBe(EMPTY);
  });

  it('evicts oldest when over capacity (LRU)', () => {
    const parse = vi.fn((src: string) => ({ src }));
    const cache = new AstCache<{ src: string } | typeof EMPTY>(parse, EMPTY);

    // Fill past capacity (32). Insertion order matters for LRU.
    for (let i = 0; i < 33; i++) cache.get(`src-${i}`);

    // src-0 should have been evicted; re-getting it should re-parse.
    parse.mockClear();
    cache.get('src-0');
    expect(parse).toHaveBeenCalledTimes(1);

    // src-32 should still be cached.
    parse.mockClear();
    cache.get('src-32');
    expect(parse).toHaveBeenCalledTimes(0);
  });
});
