import { describe, expect, it } from 'vitest';

import {
  findLiterals,
  findPatterns,
  parse,
  replaceLiteral,
  _resetParseCache,
} from './index';

const VALID = `void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}`;

describe('editor public surface', () => {
  it('parse returns same reference for same input', () => {
    _resetParseCache();
    const a = parse(VALID);
    const b = parse(VALID);
    expect(a).toBe(b);
  });

  it('parse returns an empty AST on broken source (does not throw)', () => {
    const ast = parse('not glsl');
    expect(ast).toBeTruthy();
    // findLiterals/findPatterns on a broken AST return [].
    expect(findLiterals(ast)).toEqual([]);
    expect(findPatterns(ast)).toEqual([]);
  });

  it('findLiterals returns the floats from a valid shader', () => {
    const handles = findLiterals(parse(VALID));
    const floats = handles.filter((h) => h.kind === 'float');
    // Source has vec4(1.0, 0.0, 0.0, 1.0) → 4 floats.
    expect(floats.map((h) => h.value)).toEqual([1.0, 0.0, 0.0, 1.0]);
  });

  it('findPatterns stub still returns [] (sub-project F)', () => {
    expect(findPatterns(parse(VALID))).toEqual([]);
  });

  it('replaceLiteral throws on unknown handle id', () => {
    expect(() => replaceLiteral(VALID, 'float-99', 1)).toThrow(/no float/);
  });
});
