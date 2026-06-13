import { describe, expect, it } from 'vitest';
import { lowerGlslToDag, dagToString, reachable } from './ir';

const wrap = (body: string) => `void main() {\n${body}\n}`;

describe('dataflow IR lowering', () => {
  it('collapses inlined-vs-named and renamed variables to the SAME dag', () => {
    // Three spellings of the same computation: named+mutated, inlined, renamed.
    const a = wrap(`
      vec2 p = uv;
      p = p * 2.0;
      float d = length(p) - u_c0_r;
      gl_FragColor = vec4(vec3(d), 1.0);
    `);
    const b = wrap(`
      float dist = length(uv * 2.0) - u_c0_r;
      gl_FragColor = vec4(vec3(dist), 1.0);
    `);
    const c = wrap(`
      vec2 q   =   uv;
      q = q*2.0;
      float zzz = length(q) - u_c0_r;
      gl_FragColor = vec4(vec3(zzz), 1.0);
    `);
    const sa = dagToString(lowerGlslToDag(a));
    expect(dagToString(lowerGlslToDag(b))).toBe(sa);
    expect(dagToString(lowerGlslToDag(c))).toBe(sa);
  });

  it('is deterministic — identical source yields byte-identical dag strings', () => {
    const src = wrap(`float d = sin(uv.x) + u_t; gl_FragColor = vec4(vec3(d), 1.0);`);
    const first = dagToString(lowerGlslToDag(src));
    for (let i = 0; i < 5; i += 1) {
      expect(dagToString(lowerGlslToDag(src))).toBe(first);
    }
  });

  it('applies last-writer-wins SSA + dead-code elimination', () => {
    const dag = lowerGlslToDag(wrap(`
      float x = 1.0;
      x = 2.0;
      gl_FragColor = vec4(vec3(x), 1.0);
    `));
    const out = dag.nodes.get(dag.output)!; // vec4(...)
    expect(out.t).toBe('call');
    // The output's field must trace to const 2.0, never 1.0.
    const live = reachable(dag);
    const consts = [...live].map((id) => dag.nodes.get(id)!).filter((n) => n.t === 'const');
    const values = consts.map((n) => (n as { value: number }).value).sort();
    expect(values).toEqual([1, 2]); // 1.0 from vec4 alpha; 2.0 from x — NOT a dead 1.0 for x
    // Specifically: no two separate live consts of value 1 (the dead x=1.0 is gone).
    expect(consts.filter((n) => (n as { value: number }).value === 1).length).toBe(1);
  });

  it('classifies u_* as uniforms and other free reads as inputs', () => {
    const dag = lowerGlslToDag(wrap(`gl_FragColor = vec4(uv.x, u_time, 0.0, 1.0);`));
    const kinds = [...dag.nodes.values()].map((n) => n.t);
    expect(kinds).toContain('uniform'); // u_time
    expect(kinds).toContain('input'); // uv
    const uniform = [...dag.nodes.values()].find((n) => n.t === 'uniform') as { name: string };
    expect(uniform.name).toBe('u_time');
  });

  it('detects the fragment output (fragColor or gl_FragColor)', () => {
    const a = lowerGlslToDag(wrap(`gl_FragColor = vec4(1.0);`));
    const b = lowerGlslToDag(wrap(`vec3 c = vec3(0.5); fragColor = vec4(c, 1.0);`));
    expect(a.nodes.get(a.output)!.t).toBe('call');
    expect(b.nodes.get(b.output)!.t).toBe('call');
  });
});
