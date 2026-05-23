import { describe, expect, it } from 'vitest';

import {
  findLiteralsFromSource,
  replaceLiteralInSource,
} from './literals';

const SHADER = `void main() {
  float r = 0.5;
  vec3 c = vec3(0.8, 0.2, 0.4);
  gl_FragColor = vec4(c, 1.0);
}`;

describe('findLiteralsFromSource', () => {
  it('finds float literals in source order with stable ids', () => {
    const handles = findLiteralsFromSource(SHADER);
    const floats = handles.filter((h) => h.kind === 'float');
    // Expected floats in order: 0.5, 0.8, 0.2, 0.4, 1.0
    expect(floats.map((h) => h.value)).toEqual([0.5, 0.8, 0.2, 0.4, 1.0]);
    expect(floats.map((h) => h.id)).toEqual(['float-0', 'float-1', 'float-2', 'float-3', 'float-4']);
  });

  it('finds vec3 color literals', () => {
    const handles = findLiteralsFromSource(SHADER);
    const colors = handles.filter((h) => h.kind === 'vec3-color');
    // Only vec3(0.8, 0.2, 0.4) is a color literal — vec4(c, 1.0) is not (c is identifier).
    expect(colors).toHaveLength(1);
    expect(colors[0]!.id).toBe('vec3-color-0');
    expect(colors[0]!.value).toEqual([0.8, 0.2, 0.4]);
  });

  it('returns [] for unparseable source', () => {
    expect(findLiteralsFromSource('not valid glsl')).toEqual([]);
  });

  it('reports source positions', () => {
    const handles = findLiteralsFromSource(SHADER);
    const float0 = handles.find((h) => h.id === 'float-0');
    expect(float0).toBeDefined();
    // 0.5 should be at the offset where "0.5" appears in SHADER.
    const expectedStart = SHADER.indexOf('0.5');
    expect(float0!.loc.start).toBe(expectedStart);
    expect(float0!.loc.end).toBe(expectedStart + 3); // "0.5"
  });
});

describe('replaceLiteralInSource', () => {
  it('replaces a float literal by id', () => {
    const out = replaceLiteralInSource(SHADER, 'float-0', 0.7);
    expect(out).toContain('0.7');
    expect(out).not.toContain('0.5');
  });

  it('preserves whitespace and other literals around the change', () => {
    const out = replaceLiteralInSource(SHADER, 'float-0', 0.9);
    // Everything other than the changed value should be byte-identical:
    expect(out.split('0.9').join('0.5')).toBe(SHADER);
  });

  it('round-trip: replace every float with itself yields byte-identical source', () => {
    let s = SHADER;
    const handles = findLiteralsFromSource(SHADER);
    for (const h of handles) {
      if (h.kind === 'float') {
        s = replaceLiteralInSource(s, h.id, h.value as number);
      }
    }
    expect(s).toBe(SHADER);
  });

  it('replaces a vec3 color (all three components atomically)', () => {
    const out = replaceLiteralInSource(SHADER, 'vec3-color-0', [0.1, 0.9, 0.5]);
    expect(out).toContain('vec3(0.1, 0.9, 0.5)');
    expect(out).not.toContain('vec3(0.8, 0.2, 0.4)');
  });

  it('formats integers as float literals (GLSL requires decimal point)', () => {
    const out = replaceLiteralInSource(SHADER, 'float-0', 5);
    expect(out).toContain('5.0');
    expect(out).not.toContain('5;'); // never `int` where `float` is expected
  });

  it('throws on unknown handle id', () => {
    expect(() => replaceLiteralInSource(SHADER, 'float-99', 1)).toThrow(/no float at index/);
    expect(() => replaceLiteralInSource(SHADER, 'bogus-0', 1)).toThrow(/unknown handle id/);
  });

  it('throws if value type mismatches handle kind', () => {
    // vec3 handle with a single number value
    expect(() =>
      replaceLiteralInSource(SHADER, 'vec3-color-0', 0.5 as unknown as [number, number, number]),
    ).toThrow(/requires \[r, g, b\]/);
    // float handle with an array value
    expect(() =>
      replaceLiteralInSource(SHADER, 'float-0', [0.1, 0.2, 0.3] as unknown as number),
    ).toThrow(/requires number value/);
  });
});
