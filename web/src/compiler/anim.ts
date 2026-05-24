// Animation compilation: emits the per-frame local-variable expression for
// an animated parameter, plus the list of UniformBinding entries the
// renderer needs to populate to feed it.
//
// All time-based animations switch on `mode`:
//   'hz'  — t = u_time (seconds since first mount)
//   'bpm' — t = u_time * u_tempo_bps (beats since first mount)

import type { Animation, UniformBinding } from './types';

const u = (blockId: string, paramName: string, suffix: string): string =>
  `u_${blockId}_${paramName}_${suffix}`;

export function timeExpr(mode: 'hz' | 'bpm'): string {
  return mode === 'bpm' ? '(u_time * u_tempo_bps)' : 'u_time';
}

export function emitAnimLocal(blockId: string, paramName: string, anim: Animation): string {
  const local = `_${blockId}_${paramName}`;
  switch (anim.type) {
    case 'sine': {
      const t = timeExpr(anim.mode);
      return `float ${local} = mix(${u(blockId, paramName, 'min')}, ${u(blockId, paramName, 'max')}, sin(${t} * ${u(blockId, paramName, 'speed')} + ${u(blockId, paramName, 'phase')}) * 0.5 + 0.5);`;
    }
    case 'noise_wiggle': {
      const t = timeExpr(anim.mode);
      return `float ${local} = mix(${u(blockId, paramName, 'min')}, ${u(blockId, paramName, 'max')}, noise(vec2(${t} * ${u(blockId, paramName, 'speed')}, 0.0)));`;
    }
    case 'pulse': {
      const t = timeExpr(anim.mode);
      return `float ${local} = mix(${u(blockId, paramName, 'min')}, ${u(blockId, paramName, 'max')}, step(${u(blockId, paramName, 'duty')}, fract(${t} * ${u(blockId, paramName, 'speed')})));`;
    }
    case 'mouse_follow': {
      return `float ${local} = mix(${u(blockId, paramName, 'min')}, ${u(blockId, paramName, 'max')}, u_mouse.${anim.axis});`;
    }
    case 'color_cycle': {
      const t = timeExpr(anim.mode);
      return `vec3 ${local} = mix(${u(blockId, paramName, 'color_a')}, ${u(blockId, paramName, 'color_b')}, sin(${t} * ${u(blockId, paramName, 'speed')}) * 0.5 + 0.5);`;
    }
  }
}

export function animUniformBindings(
  blockId: string,
  paramName: string,
  anim: Animation,
): UniformBinding[] {
  const floatB = (suffix: string, kind: UniformBinding['source']['kind']): UniformBinding => ({
    name: u(blockId, paramName, suffix),
    type: 'float',
    source: { kind, blockId, paramName } as UniformBinding['source'],
  });
  const vec3B = (suffix: string, kind: UniformBinding['source']['kind']): UniformBinding => ({
    name: u(blockId, paramName, suffix),
    type: 'vec3',
    source: { kind, blockId, paramName } as UniformBinding['source'],
  });

  switch (anim.type) {
    case 'sine':
      return [
        floatB('min', 'anim_min'),
        floatB('max', 'anim_max'),
        floatB('speed', 'anim_speed'),
        floatB('phase', 'anim_phase'),
      ];
    case 'noise_wiggle':
      return [
        floatB('min', 'anim_min'),
        floatB('max', 'anim_max'),
        floatB('speed', 'anim_speed'),
      ];
    case 'pulse':
      return [
        floatB('min', 'anim_min'),
        floatB('max', 'anim_max'),
        floatB('speed', 'anim_speed'),
        floatB('duty', 'anim_duty'),
      ];
    case 'mouse_follow':
      return [floatB('min', 'anim_min'), floatB('max', 'anim_max')];
    case 'color_cycle':
      return [
        vec3B('color_a', 'anim_color_a'),
        vec3B('color_b', 'anim_color_b'),
        floatB('speed', 'anim_speed'),
      ];
  }
}

/** True if the animation produces a vec3 (only `color_cycle`). */
export function animYieldsVec3(anim: Animation): boolean {
  return anim.type === 'color_cycle';
}
