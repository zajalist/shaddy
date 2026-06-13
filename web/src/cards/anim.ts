// Per-parameter animation codegen for the LIVE cards compiler.
//
// When a param is animated, the compiler emits a per-frame GLSL local (driven
// by u_time / u_mouse) and substitutes the snippet placeholder to that local
// instead of the static uniform. The endpoints (min/max/speed/…) are emitted as
// live uniforms so the integration layer can push their current values every
// time the user drags them — a cheap setUniform, never a relink.
//
// This is a cards-local adaptation of the parked compiler/anim.ts — NOT a port:
// the live UniformBinding carries a concrete `value`, uniforms are keyed by card
// INDEX (`u_card{i}_…`), and noise uses the live `noise2` helper. Time-driven
// only (hz); there is no u_tempo_bps in the renderer.

import type { Animation, ColorRgb } from './types';
import { encodeAnim as u } from './uniform-names';

/** The GLSL local that holds an animated param's per-frame value. */
export function animLocalName(cardIndex: number, paramKey: string): string {
  return `_card${cardIndex}_${paramKey}`;
}

/** True for animations that produce a vec3 (colour) rather than a float. */
export function animYieldsVec3(anim: Animation): boolean {
  return anim.type === 'color_cycle';
}

/** GLSL helper functions an animation depends on (added to the helper closure). */
export function animHelpers(anim: Animation): string[] {
  return anim.type === 'noise' ? ['noise2'] : [];
}

/** The per-frame local declaration for an animated param. References the
 *  endpoint uniforms + a standard time/mouse uniform. */
export function emitAnimLocal(cardIndex: number, paramKey: string, anim: Animation): string {
  const local = animLocalName(cardIndex, paramKey);
  const uu = (s: string): string => u(cardIndex, paramKey, s);
  switch (anim.type) {
    case 'sine':
      return `float ${local} = mix(${uu('min')}, ${uu('max')}, sin(u_time * ${uu('speed')} + ${uu('phase')}) * 0.5 + 0.5);`;
    case 'pulse':
      return `float ${local} = mix(${uu('min')}, ${uu('max')}, step(${uu('duty')}, fract(u_time * ${uu('speed')})));`;
    case 'noise':
      return `float ${local} = mix(${uu('min')}, ${uu('max')}, noise2(vec2(u_time * ${uu('speed')}, 0.0)));`;
    case 'mouse':
      return `float ${local} = mix(${uu('min')}, ${uu('max')}, clamp(u_mouse.${anim.axis} * 0.5 + 0.5, 0.0, 1.0));`;
    case 'color_cycle':
      return `vec3 ${local} = mix(${uu('color_a')}, ${uu('color_b')}, sin(u_time * ${uu('speed')}) * 0.5 + 0.5);`;
    case 'custom':
      // Custom chains fold to a shared `_anim_<id>` local in compile.ts, never
      // through this per-card emitter. Unreachable; here only for totality.
      return '';
  }
}

export type AnimUniform = {
  name: string;
  /** Namespaced so it never collides with the host card's own param keys. */
  paramKey: string;
  glType: 'float' | 'vec3';
  value: number | ColorRgb;
};

/** The live uniforms an animated param needs, each carrying its current value
 *  pulled straight off the Animation object. */
export function animUniforms(cardIndex: number, paramKey: string, anim: Animation): AnimUniform[] {
  const f = (s: string, value: number): AnimUniform => ({ name: u(cardIndex, paramKey, s), paramKey: `${paramKey}_${s}`, glType: 'float', value });
  const c = (s: string, value: ColorRgb): AnimUniform => ({ name: u(cardIndex, paramKey, s), paramKey: `${paramKey}_${s}`, glType: 'vec3', value });
  switch (anim.type) {
    case 'sine': return [f('min', anim.min), f('max', anim.max), f('speed', anim.speed), f('phase', anim.phase)];
    case 'pulse': return [f('min', anim.min), f('max', anim.max), f('speed', anim.speed), f('duty', anim.duty)];
    case 'noise': return [f('min', anim.min), f('max', anim.max), f('speed', anim.speed)];
    case 'mouse': return [f('min', anim.min), f('max', anim.max)];
    case 'color_cycle': return [c('color_a', anim.colorA), c('color_b', anim.colorB), f('speed', anim.speed)];
    case 'custom': return []; // chain params bake to literals — no per-param uniform
  }
}

/** A sensible starting animation when the user first animates a FLOAT param —
 *  a sine wobble straddling the current value within the param's range. */
export function defaultFloatAnimation(value: number, range: { min: number; max: number }): Animation {
  const span = Math.max(0, range.max - range.min);
  const amp = span > 0 ? span * 0.25 : Math.max(0.1, Math.abs(value) * 0.5);
  const min = Math.max(range.min, value - amp);
  const max = Math.min(range.max, value + amp);
  return { type: 'sine', min, max: max > min ? max : min + amp, speed: 1, phase: 0 };
}

/** Starting animation for a COLOUR param — cycle between the current colour and
 *  a contrasting one. */
export function defaultColorAnimation(value: ColorRgb): Animation {
  const inv: ColorRgb = [1 - value[0], 1 - value[1], 1 - value[2]];
  return { type: 'color_cycle', colorA: value, colorB: inv, speed: 0.5 };
}

/** Re-key an existing animation to a new kind, carrying over shared endpoints
 *  (min/max/speed) so switching kinds in the UI doesn't reset everything. */
export function reKeyAnimation(anim: Animation, type: Animation['type'], value: number, range: { min: number; max: number }): Animation {
  if (type === anim.type) return anim;
  if (type === 'color_cycle') return defaultColorAnimation([value, value, value] as ColorRgb);
  const base = anim.type === 'color_cycle'
    ? defaultFloatAnimation(value, range)
    : anim;
  const min = 'min' in base ? base.min : range.min;
  const max = 'max' in base ? base.max : range.max;
  const speed = 'speed' in base ? base.speed : 1;
  switch (type) {
    case 'sine': return { type, min, max, speed, phase: 0 };
    case 'pulse': return { type, min, max, speed, duty: 0.5 };
    case 'noise': return { type, min, max, speed };
    case 'mouse': return { type, min, max, axis: 'x' };
    // 'custom' is created via its own canvas path (a chain + ref), not by
    // re-keying a built-in waveform — leave the animation unchanged here.
    case 'custom': return anim;
  }
}
