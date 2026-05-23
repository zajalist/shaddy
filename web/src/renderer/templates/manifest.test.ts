import { describe, expect, it } from 'vitest';
import { TEMPLATES } from './manifest';

describe('TEMPLATES manifest', () => {
  it('ships exactly 12 starter templates (per issue #10)', () => {
    expect(TEMPLATES.length).toBe(12);
  });

  it('has unique ids', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes the headline starter ids', () => {
    const ids = new Set(TEMPLATES.map((t) => t.id));
    expect(ids.has('plasma')).toBe(true);
    expect(ids.has('voronoi-cells')).toBe(true);
    expect(ids.has('gradient-noise')).toBe(true);
  });

  it('every template has a non-empty source and a human name', () => {
    for (const t of TEMPLATES) {
      expect(t.source.trim().length).toBeGreaterThan(0);
      expect(t.name.trim().length).toBeGreaterThan(0);
    }
  });

  it('every source contains a void main() entry point', () => {
    for (const t of TEMPLATES) {
      expect(t.source).toMatch(/void\s+main\s*\(\s*\)/);
    }
  });
});
