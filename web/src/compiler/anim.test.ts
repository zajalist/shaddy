import { describe, expect, it } from 'vitest';
import { emitAnimLocal, animUniformBindings, timeExpr } from './anim';
import type { Animation } from './types';

describe('timeExpr', () => {
  it('hz mode returns u_time', () => {
    expect(timeExpr('hz')).toBe('u_time');
  });
  it('bpm mode scales by u_tempo_bps', () => {
    expect(timeExpr('bpm')).toBe('(u_time * u_tempo_bps)');
  });
});

describe('emitAnimLocal', () => {
  it('sine: mix(min, max, sin(t * speed + phase) * 0.5 + 0.5)', () => {
    const anim: Animation = { type: 'sine', min: 5, max: 15, speed: 1.2, phase: 0, mode: 'hz' };
    const out = emitAnimLocal('b1', 'freq', anim);
    expect(out).toContain('float _b1_freq');
    expect(out).toContain(
      'mix(u_b1_freq_min, u_b1_freq_max, sin(u_time * u_b1_freq_speed + u_b1_freq_phase) * 0.5 + 0.5)',
    );
  });

  it('noise_wiggle: mix(min, max, noise(vec2(t * speed, 0.0)))', () => {
    const anim: Animation = { type: 'noise_wiggle', min: 0, max: 1, speed: 1, mode: 'hz' };
    const out = emitAnimLocal('b1', 'x', anim);
    expect(out).toContain('mix(u_b1_x_min, u_b1_x_max, noise(vec2(u_time * u_b1_x_speed, 0.0)))');
  });

  it('pulse: mix(min, max, step(duty, fract(t * speed)))', () => {
    const anim: Animation = { type: 'pulse', min: 0, max: 1, speed: 1, duty: 0.5, mode: 'hz' };
    const out = emitAnimLocal('b1', 'x', anim);
    expect(out).toContain(
      'mix(u_b1_x_min, u_b1_x_max, step(u_b1_x_duty, fract(u_time * u_b1_x_speed)))',
    );
  });

  it('mouse_follow: mix(min, max, u_mouse.<axis>)', () => {
    const anim: Animation = { type: 'mouse_follow', min: 0, max: 1, axis: 'x' };
    expect(emitAnimLocal('b1', 'x', anim)).toContain(
      'mix(u_b1_x_min, u_b1_x_max, u_mouse.x)',
    );
    const animY: Animation = { type: 'mouse_follow', min: 0, max: 1, axis: 'y' };
    expect(emitAnimLocal('b1', 'y', animY)).toContain('u_mouse.y');
  });

  it('color_cycle: mix(colorA, colorB, sin(t * speed) * 0.5 + 0.5); type is vec3', () => {
    const anim: Animation = {
      type: 'color_cycle',
      colorA: [1, 0, 0],
      colorB: [0, 1, 0],
      speed: 1,
      mode: 'hz',
    };
    const out = emitAnimLocal('b1', 'c', anim);
    expect(out).toContain('vec3 _b1_c');
    expect(out).toContain(
      'mix(u_b1_c_color_a, u_b1_c_color_b, sin(u_time * u_b1_c_speed) * 0.5 + 0.5)',
    );
  });

  it('bpm mode replaces u_time with (u_time * u_tempo_bps)', () => {
    const anim: Animation = { type: 'sine', min: 0, max: 1, speed: 1, phase: 0, mode: 'bpm' };
    expect(emitAnimLocal('b1', 'x', anim)).toContain('(u_time * u_tempo_bps)');
  });
});

describe('animUniformBindings', () => {
  it('sine produces min, max, speed, phase floats', () => {
    const anim: Animation = { type: 'sine', min: 0, max: 1, speed: 1, phase: 0, mode: 'hz' };
    const bs = animUniformBindings('b1', 'x', anim);
    expect(bs.map((b) => b.source.kind).sort()).toEqual([
      'anim_max',
      'anim_min',
      'anim_phase',
      'anim_speed',
    ]);
    expect(bs.every((b) => b.type === 'float')).toBe(true);
  });

  it('pulse produces min, max, speed, duty', () => {
    const anim: Animation = { type: 'pulse', min: 0, max: 1, speed: 1, duty: 0.5, mode: 'hz' };
    const bs = animUniformBindings('b1', 'x', anim);
    expect(bs.map((b) => b.source.kind).sort()).toEqual([
      'anim_duty',
      'anim_max',
      'anim_min',
      'anim_speed',
    ]);
  });

  it('color_cycle produces colorA + colorB as vec3 + speed', () => {
    const anim: Animation = {
      type: 'color_cycle',
      colorA: [1, 0, 0],
      colorB: [0, 1, 0],
      speed: 1,
      mode: 'hz',
    };
    const bs = animUniformBindings('b1', 'c', anim);
    const types = bs.map((b) => b.type).sort();
    expect(types).toEqual(['float', 'vec3', 'vec3']);
  });

  it('mouse_follow produces just min + max', () => {
    const anim: Animation = { type: 'mouse_follow', min: 0, max: 1, axis: 'x' };
    const bs = animUniformBindings('b1', 'x', anim);
    expect(bs.length).toBe(2);
  });
});
