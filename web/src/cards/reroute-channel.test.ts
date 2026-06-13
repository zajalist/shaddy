import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import type { Recipe } from './types';

// Typed reroutes: a reroute can carry the distance field (d) or uv, not just
// colour. The default 'colour' channel stays byte-identical to the legacy
// rr_<id> emission. See compiler-review roadmap (typed-reroutes-d-uv).
const decl = (id: string, name: string, channel: number) =>
  ({ kind: 'typed', id, type: 'reroute_decl', enabled: true, params: { name: { value: name, animation: null }, channel: { value: channel, animation: null } } }) as const;
const use = (id: string, ref: string, channel: number) =>
  ({ kind: 'typed', id, type: 'reroute_use', enabled: true, params: { ref: { value: ref, animation: null }, channel: { value: channel, animation: null } } }) as const;
const square = (id: string) =>
  ({ kind: 'typed', id, type: 'square', enabled: true, params: { size: { value: 0.3, animation: null }, edge: { value: 0.02, animation: null } } }) as const;

describe('typed reroutes — channels', () => {
  it('colour channel is byte-identical to the legacy emission', () => {
    const recipe: Recipe = { canvasAspect: 'square', cards: [square('s0'), decl('d0', 'fog', 0), use('u0', 'fog', 0)] };
    const out = compile(recipe);
    expect(out.glsl).toContain('vec3 rr_fog = vec3(0.0);');
    expect(out.glsl).toContain('  rr_fog = col;');
    expect(out.glsl).toContain('  col = rr_fog;');
  });

  it('distance channel pre-declares a float and taps d', () => {
    const recipe: Recipe = { canvasAspect: 'square', cards: [square('s0'), decl('d0', 'mask', 1), use('u0', 'mask', 1)] };
    const out = compile(recipe);
    expect(out.glsl).toContain('float rr_mask__d = 0.0;');
    expect(out.glsl).toContain('  rr_mask__d = d;');
    expect(out.glsl).toContain('  d = rr_mask__d;');
  });

  it('uv channel pre-declares a vec2 and taps uv', () => {
    const recipe: Recipe = { canvasAspect: 'square', cards: [decl('d0', 'warp', 2), use('u0', 'warp', 2)] };
    const out = compile(recipe);
    expect(out.glsl).toContain('vec2 rr_warp__uv = vec2(0.0);');
    expect(out.glsl).toContain('  rr_warp__uv = uv;');
    expect(out.glsl).toContain('  uv = rr_warp__uv;');
  });

  it('emits no uniform for the compile-only channel param', () => {
    const recipe: Recipe = { canvasAspect: 'square', cards: [decl('d0', 'fog', 1)] };
    const out = compile(recipe);
    expect(out.glsl).not.toContain('u_card0_channel');
  });
});
