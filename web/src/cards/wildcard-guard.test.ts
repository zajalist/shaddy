import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import type { Recipe } from './types';

// A wildcard body that references u_card*/u_buffer* names the build doesn't
// declare must NOT produce an undeclared-identifier GL error (which blanks the
// preview). The compiler declares benign fallbacks. See compiler-review
// roadmap (wildcard-uniform-guard).
describe('dangling-uniform guard for wildcards', () => {
  it('declares float + sampler fallbacks for undeclared wildcard refs', () => {
    const recipe: Recipe = {
      canvasAspect: 'square',
      cards: [
        { kind: 'wildcard', id: 'w0', enabled: true, displayName: 'custom',
          rawSource: '  col = vec3(u_card9_size);\n  col *= texture(u_card9_tex, uv).rgb;' },
      ],
    };
    const out = compile(recipe);
    expect(out.glsl).toContain('uniform float u_card9_size;');
    expect(out.glsl).toContain('uniform sampler2D u_card9_tex;');
    // No undeclared u_card* ref remains.
    const refs = new Set([...out.glsl.matchAll(/u_card\d+_[a-z_]+/gi)].map((m) => m[0]));
    const decls = new Set([...out.glsl.matchAll(/uniform \w+ (u_card\d+_[a-z_]+);/gi)].map((m) => m[1]));
    expect([...refs].filter((r) => !decls.has(r))).toEqual([]);
  });

  it('adds nothing for a recipe with no dangling refs (byte-identical preserved)', () => {
    const recipe: Recipe = {
      canvasAspect: 'square',
      cards: [{ kind: 'typed', id: 's0', type: 'square', enabled: true, params: { size: { value: 0.3, animation: null }, edge: { value: 0.02, animation: null } } }],
    };
    expect(compile(recipe).glsl).not.toContain('fallback');
  });
});
