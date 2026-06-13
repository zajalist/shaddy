import { describe, expect, it } from 'vitest';
import { lowerGlslToDag, dagToString } from './ir';
import { normalizeDag } from './normalize';

const wrap = (body: string) => `void main() {\n${body}\n}`;
const norm = (body: string) => dagToString(normalizeDag(lowerGlslToDag(wrap(body))));

describe('normalizer', () => {
  it('constant-folds', () => {
    expect(norm(`gl_FragColor = vec4(vec3(2.0 + 3.0 * 4.0), 1.0);`))
      .toBe(norm(`gl_FragColor = vec4(vec3(14.0), 1.0);`));
  });

  it('applies identity simplifications (x*1, x+0, x-0, 0*x)', () => {
    const id = norm(`gl_FragColor = vec4(vec3(uv.x), 1.0);`);
    expect(norm(`gl_FragColor = vec4(vec3(uv.x * 1.0), 1.0);`)).toBe(id);
    expect(norm(`gl_FragColor = vec4(vec3(uv.x + 0.0), 1.0);`)).toBe(id);
    expect(norm(`gl_FragColor = vec4(vec3(uv.x - 0.0), 1.0);`)).toBe(id);
    // 0*x collapses to the constant 0
    expect(norm(`gl_FragColor = vec4(vec3(uv.x * 0.0), 1.0);`))
      .toBe(norm(`gl_FragColor = vec4(vec3(0.0), 1.0);`));
  });

  it('rewrites pow(x,2.0) → x*x and pow(x,1.0) → x', () => {
    expect(norm(`gl_FragColor = vec4(vec3(pow(uv.x, 2.0)), 1.0);`))
      .toBe(norm(`gl_FragColor = vec4(vec3(uv.x * uv.x), 1.0);`));
    expect(norm(`gl_FragColor = vec4(vec3(pow(uv.x, 1.0)), 1.0);`))
      .toBe(norm(`gl_FragColor = vec4(vec3(uv.x), 1.0);`));
  });

  it('rewrites sqrt(dot(v,v)) → length(v)', () => {
    expect(norm(`gl_FragColor = vec4(vec3(sqrt(dot(uv, uv))), 1.0);`))
      .toBe(norm(`gl_FragColor = vec4(vec3(length(uv)), 1.0);`));
  });

  it('canonicalizes commutative operand order (a+b ≡ b+a)', () => {
    expect(norm(`gl_FragColor = vec4(vec3(uv.x + u_t), 1.0);`))
      .toBe(norm(`gl_FragColor = vec4(vec3(u_t + uv.x), 1.0);`));
  });

  it('is idempotent — normalize∘normalize = normalize', () => {
    const src = wrap(`
      float a = pow(uv.x, 2.0) + 0.0;
      float b = sqrt(dot(uv, uv)) * 1.0;
      gl_FragColor = vec4(vec3(a + b + (2.0 - 2.0)), 1.0);
    `);
    const once = normalizeDag(lowerGlslToDag(src));
    const twice = normalizeDag(once);
    expect(dagToString(twice)).toBe(dagToString(once));
  });

  it('is a no-op on already-canonical form (identity)', () => {
    const src = wrap(`float d = length(uv) - u_r; gl_FragColor = vec4(vec3(d), 1.0);`);
    const dag = lowerGlslToDag(src);
    expect(dagToString(normalizeDag(dag))).toBe(dagToString(dag));
  });
});
