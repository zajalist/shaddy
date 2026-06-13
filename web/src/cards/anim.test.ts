import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import type { Animation, Recipe } from './types';

// Per-parameter animation: an animated param emits a per-frame GLSL local
// driven by u_time, plus live endpoint uniforms (min/max/speed/…) — NOT the
// single static uniform. See compiler-review roadmap (wire-live-animation).
const sized = (anim: Animation | null) =>
  ({ kind: 'typed', id: 's0', type: 'square', enabled: true,
     params: { size: { value: 0.3, animation: anim }, edge: { value: 0.02, animation: null } } }) as const;

describe('per-param animation — compile', () => {
  it('a non-animated recipe is unchanged (byte-identical baseline)', () => {
    const plain = compile({ canvasAspect: 'square', cards: [sized(null)] });
    expect(plain.glsl).toContain('uniform float u_card0_size;');
    expect(plain.glsl).not.toContain('_card0_size =');
  });

  it('sine: emits the local + endpoint uniforms, drops the static uniform', () => {
    const out = compile({ canvasAspect: 'square', cards: [sized({ type: 'sine', min: 0.1, max: 0.5, speed: 1, phase: 0 })] });
    expect(out.glsl).toContain('float _card0_size = mix(u_card0_size_min, u_card0_size_max, sin(u_time * u_card0_size_speed + u_card0_size_phase) * 0.5 + 0.5);');
    expect(out.glsl).toContain('uniform float u_card0_size_min;');
    expect(out.glsl).toContain('uniform float u_card0_size_speed;');
    expect(out.glsl).not.toContain('uniform float u_card0_size;'); // static gone
    // The snippet now references the local, not the static uniform.
    expect(out.glsl).toContain('vec2(_card0_size)');
    // Endpoint uniforms carry their values for the live setUniform path.
    expect(out.uniforms.find((u) => u.name === 'u_card0_size_min')?.value).toBe(0.1);
    expect(out.uniforms.find((u) => u.name === 'u_card0_size_max')?.value).toBe(0.5);
  });

  it('noise: pulls in the noise2 helper', () => {
    const out = compile({ canvasAspect: 'square', cards: [sized({ type: 'noise', min: 0.1, max: 0.5, speed: 1 })] });
    expect(out.glsl).toContain('noise2(vec2(u_time * u_card0_size_speed, 0.0))');
    expect(out.glsl).toContain('float noise2(vec2 p)'); // helper emitted
  });

  it('mouse: reads u_mouse on the chosen axis', () => {
    const out = compile({ canvasAspect: 'square', cards: [sized({ type: 'mouse', min: 0.1, max: 0.5, axis: 'y' })] });
    expect(out.glsl).toContain('clamp(u_mouse.y * 0.5 + 0.5, 0.0, 1.0)');
  });

  it('color_cycle: a vec3 local between two colour uniforms', () => {
    const card = { kind: 'typed', id: 'p0', type: 'palette', enabled: true,
      params: {
        color_a: { value: [1, 0, 0], animation: { type: 'color_cycle', colorA: [1, 0, 0], colorB: [0, 0, 1], speed: 0.5 } as Animation },
        color_b: { value: [0, 1, 0], animation: null },
      } } as const;
    const out = compile({ canvasAspect: 'square', cards: [card] });
    expect(out.glsl).toContain('vec3 _card0_color_a = mix(u_card0_color_a_color_a, u_card0_color_a_color_b, sin(u_time * u_card0_color_a_speed) * 0.5 + 0.5);');
    expect(out.uniforms.find((u) => u.name === 'u_card0_color_a_color_a')?.value).toEqual([1, 0, 0]);
  });

  it('same recipe → byte-identical glsl (invariant holds for animated cards)', () => {
    const r: Recipe = { canvasAspect: 'square', cards: [sized({ type: 'sine', min: 0.1, max: 0.5, speed: 2, phase: 1 })] };
    expect(compile(r).glsl).toBe(compile(r).glsl);
  });
});
