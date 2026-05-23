import { describe, expect, it } from 'vitest';

import { parseGlsl } from './glsl';
import { findPatternsFromAst } from './patterns';

const CIRCLE_SHADER = `void main() {
  vec2 uv = gl_FragCoord.xy;
  float d = length(uv - vec2(0.5, 0.5));
  gl_FragColor = vec4(vec3(d), 1.0);
}`;

const COLOR_SHADER = `void main() {
  gl_FragColor = vec4(vec3(0.8, 0.2, 0.4), 1.0);
}`;

const COLOR_DIRECT_SHADER = `void main() {
  gl_FragColor = vec3(0.1, 0.9, 0.5);
}`;

const SMOOTHSTEP_SHADER = `void main() {
  float s = smoothstep(0.2, 0.8, gl_FragCoord.x);
  gl_FragColor = vec4(vec3(s), 1.0);
}`;

const ALL_THREE = `void main() {
  vec2 uv = gl_FragCoord.xy;
  float d = length(uv - vec2(0.5, 0.5));
  float s = smoothstep(0.2, 0.8, d);
  gl_FragColor = vec4(vec3(0.8, 0.2, 0.4), 1.0);
}`;

describe('findPatternsFromAst', () => {
  it('matches a circle from length(uv - vec2(x, y))', () => {
    const ast = parseGlsl(CIRCLE_SHADER);
    const patterns = findPatternsFromAst(ast);
    const circles = patterns.filter((p) => p.kind === 'circle');
    expect(circles).toHaveLength(1);
    const c = circles[0];
    if (c && c.kind === 'circle') {
      expect(c.cx.value).toBe(0.5);
      expect(c.cy.value).toBe(0.5);
    }
  });

  it('matches a color from final vec4(vec3(r, g, b), a) assignment to gl_FragColor', () => {
    const ast = parseGlsl(COLOR_SHADER);
    const patterns = findPatternsFromAst(ast);
    const colors = patterns.filter((p) => p.kind === 'color');
    expect(colors).toHaveLength(1);
    const c1 = colors[0];
    if (c1 && c1.kind === 'color') {
      expect(c1.rgb.value).toEqual([0.8, 0.2, 0.4]);
    }
  });

  it('matches a color from direct vec3 assignment to gl_FragColor', () => {
    const ast = parseGlsl(COLOR_DIRECT_SHADER);
    const patterns = findPatternsFromAst(ast);
    const colors = patterns.filter((p) => p.kind === 'color');
    expect(colors).toHaveLength(1);
    const c2 = colors[0];
    if (c2 && c2.kind === 'color') {
      expect(c2.rgb.value).toEqual([0.1, 0.9, 0.5]);
    }
  });

  it('matches smoothstep(A, B, x)', () => {
    const ast = parseGlsl(SMOOTHSTEP_SHADER);
    const patterns = findPatternsFromAst(ast);
    const ss = patterns.filter((p) => p.kind === 'smoothstep');
    expect(ss).toHaveLength(1);
    const s = ss[0];
    if (s && s.kind === 'smoothstep') {
      expect(s.a.value).toBe(0.2);
      expect(s.b.value).toBe(0.8);
    }
  });

  it('matches all three patterns in one shader', () => {
    const ast = parseGlsl(ALL_THREE);
    const patterns = findPatternsFromAst(ast);
    const kinds = patterns.map((p) => p.kind).sort();
    expect(kinds).toEqual(['circle', 'color', 'smoothstep']);
  });

  it('returns [] for unparseable source', () => {
    const ast = parseGlsl('not glsl');
    expect(findPatternsFromAst(ast)).toEqual([]);
  });

  it('does not match a circle when vec2 args are not numeric literals', () => {
    const src = `void main() {
      vec2 uv = gl_FragCoord.xy;
      vec2 center = vec2(0.5, 0.5);
      float d = length(uv - center);
      gl_FragColor = vec4(vec3(d), 1.0);
    }`;
    const patterns = findPatternsFromAst(parseGlsl(src));
    expect(patterns.filter((p) => p.kind === 'circle')).toHaveLength(0);
  });

  it('emits multiple smoothstep matches when present', () => {
    const src = `void main() {
      float a = smoothstep(0.1, 0.3, gl_FragCoord.x);
      float b = smoothstep(0.6, 0.9, gl_FragCoord.y);
      gl_FragColor = vec4(vec3(a + b), 1.0);
    }`;
    const patterns = findPatternsFromAst(parseGlsl(src));
    const ss = patterns.filter((p) => p.kind === 'smoothstep');
    expect(ss).toHaveLength(2);
  });
});
