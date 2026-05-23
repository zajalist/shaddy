import { describe, expect, it } from 'vitest';

import { EMPTY_AST, parseGlsl } from './glsl';

const VALID = `void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}`;

describe('parseGlsl', () => {
  it('parses valid GLSL to a non-null AST', () => {
    const ast = parseGlsl(VALID);
    expect(ast).not.toBeNull();
    expect(ast).not.toBe(EMPTY_AST);
  });

  it('returns null on syntactically broken GLSL', () => {
    const ast = parseGlsl('void main() { gl_FragColor = vec4(1.0, ');
    expect(ast).toBeNull();
  });

  it('EMPTY_AST is frozen', () => {
    expect(Object.isFrozen(EMPTY_AST)).toBe(true);
  });
});
