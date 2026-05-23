import { describe, expect, it } from 'vitest';
import { injectReturnAfterLine } from './lens-stack';

describe('injectReturnAfterLine', () => {
  const SRC = ['void main() {', '  vec3 c = vec3(0.0);', '  c.r = 1.0;', '  fragColor = vec4(c, 1.0);', '}'].join('\n');

  it('inserts "return;" after the requested 1-based line', () => {
    const out = injectReturnAfterLine(SRC, 3);
    const lines = out.split('\n');
    expect(lines[3]).toBe('return;');
    expect(lines[0]).toBe('void main() {');
    expect(lines[1]).toBe('  vec3 c = vec3(0.0);');
    expect(lines[2]).toBe('  c.r = 1.0;');
  });

  it('preserves the original line count + 1 (the injected return)', () => {
    const original = SRC.split('\n').length;
    expect(injectReturnAfterLine(SRC, 2).split('\n').length).toBe(original + 1);
  });

  it('returns source unchanged for out-of-range line numbers', () => {
    expect(injectReturnAfterLine(SRC, 0)).toBe(SRC);
    expect(injectReturnAfterLine(SRC, -1)).toBe(SRC);
    expect(injectReturnAfterLine(SRC, 999)).toBe(SRC);
  });

  it('returns source unchanged for non-integer line numbers', () => {
    expect(injectReturnAfterLine(SRC, 1.5)).toBe(SRC);
    expect(injectReturnAfterLine(SRC, Number.NaN)).toBe(SRC);
  });

  it('can break at the very first line', () => {
    const out = injectReturnAfterLine(SRC, 1);
    expect(out.split('\n')[1]).toBe('return;');
  });

  it('can break at the very last line (just before closing brace)', () => {
    const out = injectReturnAfterLine(SRC, 5);
    const lines = out.split('\n');
    expect(lines[5]).toBe('return;');
    expect(lines[4]).toBe('}');
  });

  it('three break lines produce three distinct variants', () => {
    // The acceptance criterion calls out "tests with 3 break lines on a
    // known template" — variants must differ where they short-circuit.
    const variants = [2, 3, 4].map((line) => injectReturnAfterLine(SRC, line));
    expect(new Set(variants).size).toBe(3);
    for (const v of variants) {
      expect(v.includes('return;')).toBe(true);
    }
  });
});
