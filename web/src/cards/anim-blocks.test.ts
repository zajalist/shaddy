import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import { foldAnimChain, animLocalName, defaultAnimBlock, animChainHelpers } from './anim-blocks';
import type { AnimChain, Recipe } from './types';

// Custom animations: a shared AnimChain folds to ONE per-frame local
// (`_anim_<id>`) and every param bound via `animation:{type:'custom',ref}`
// resolves to it. See docs/superpowers/specs/2026-06-03-custom-animations-design.md

// A square card whose `size` param binds to a custom chain `ref` (or nothing).
const sizedBoundTo = (ref: string | null) =>
  ({
    kind: 'typed', id: 's0', type: 'square', enabled: true,
    params: {
      size: { value: 0.3, animation: ref ? ({ type: 'custom', ref } as const) : null },
      edge: { value: 0.02, animation: null },
    },
  }) as const;

// A chain of blocks (all default params).
const chain = (id: string, name: string, types: string[]): AnimChain =>
  ({ id, name, blocks: types.map((t, i) => defaultAnimBlock(t, `${id}_b${i}`)) });

const recipe = (cards: Recipe['cards'], animations?: AnimChain[]): Recipe =>
  ({ canvasAspect: 'square', cards, ...(animations ? { animations } : {}) });

describe('foldAnimChain — chain → GLSL statements', () => {
  it('folds time → oscillate → remap onto one running local (baked params)', () => {
    const glsl = foldAnimChain(chain('w', 'Wobble', ['time', 'oscillate', 'remap'])).join('\n');
    expect(glsl).toContain('float _anim_w = u_time;');
    expect(glsl).toContain('_anim_w = (u_time * 1.0);');
    expect(glsl).toContain('_anim_w = (sin(_anim_w * 1.0 + 0.0) * 0.5 + 0.5);');
    expect(glsl).toContain('_anim_w = mix(0.0, 1.0, _anim_w);');
  });

  it('sanitises the chain id into a GLSL-safe local name', () => {
    expect(animLocalName('a-b.c')).toBe('_anim_a_b_c');
  });

  it('noise blocks request the noise2 helper', () => {
    expect(animChainHelpers(chain('n', 'N', ['time', 'noise']))).toEqual(['noise2']);
    expect(animChainHelpers(chain('o', 'O', ['time', 'oscillate']))).toEqual([]);
  });
});

describe('compile — custom-bound params', () => {
  it('a non-animated recipe is unchanged (byte-identical baseline)', () => {
    const out = compile(recipe([sizedBoundTo(null)]));
    expect(out.glsl).toContain('uniform float u_card0_size;');
    expect(out.glsl).not.toContain('_anim_');
    expect(out.glsl).not.toContain('// === animations ===');
  });

  it('a bound param folds the chain once and references its local', () => {
    const out = compile(recipe([sizedBoundTo('w')], [chain('w', 'Wobble', ['time', 'oscillate', 'remap'])]));
    expect(out.glsl).toContain('// === animations ===');
    expect(out.glsl).toContain('float _anim_w = u_time;');
    expect(out.glsl).toContain('vec2(_anim_w)'); // snippet references the local
    expect(out.glsl).not.toContain('uniform float u_card0_size;'); // static gone
  });

  it('reuse: two params bound to the same chain emit ONE local, two references', () => {
    const c0 = sizedBoundTo('w');
    const c1 = { ...sizedBoundTo('w'), id: 's1' };
    const out = compile(recipe([c0, c1], [chain('w', 'Wobble', ['time', 'oscillate'])]));
    const decls = out.glsl.split('\n').filter((l) => l.includes('float _anim_w = u_time;'));
    expect(decls).toHaveLength(1);
    expect(out.glsl.match(/vec2\(_anim_w\)/g)).toHaveLength(2);
  });

  it('an orphan ref (chain deleted) falls back to the static uniform', () => {
    const out = compile(recipe([sizedBoundTo('gone')], [chain('w', 'Wobble', ['time'])]));
    expect(out.glsl).toContain('uniform float u_card0_size;');
    expect(out.glsl).toContain('vec2(u_card0_size)');
    expect(out.glsl).not.toContain('_anim_gone');
  });

  it('only referenced chains fold (an unused chain is absent)', () => {
    const out = compile(recipe([sizedBoundTo('w')], [
      chain('w', 'Wobble', ['time', 'oscillate']),
      chain('unused', 'Unused', ['time', 'noise']),
    ]));
    expect(out.glsl).toContain('_anim_w');
    expect(out.glsl).not.toContain('_anim_unused');
    expect(out.glsl).not.toContain('float noise2(vec2 p)'); // unused chain's helper not pulled
  });

  it('a noise chain pulls the noise2 helper into the shader', () => {
    const out = compile(recipe([sizedBoundTo('n')], [chain('n', 'N', ['time', 'noise', 'remap'])]));
    expect(out.glsl).toContain('noise2(vec2(_anim_n * 1.0, 0.0))');
    expect(out.glsl).toContain('float noise2(vec2 p)');
  });

  it('same recipe → byte-identical glsl (invariant holds with custom animations)', () => {
    const r = recipe([sizedBoundTo('w')], [chain('w', 'Wobble', ['time', 'oscillate', 'remap'])]);
    expect(compile(r).glsl).toBe(compile(r).glsl);
  });
});
