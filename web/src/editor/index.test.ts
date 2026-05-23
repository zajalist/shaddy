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

  it('findLiterals stub returns [] (sub-project E)', () => {
    expect(findLiterals(parse(VALID))).toEqual([]);
  });

  it('findPatterns stub returns [] (sub-project F)', () => {
    expect(findPatterns(parse(VALID))).toEqual([]);
  });

  it('replaceLiteral throws explicitly (sub-project E)', () => {
    expect(() => replaceLiteral(VALID, 'foo', 1)).toThrow(/not implemented/);
  });
});
