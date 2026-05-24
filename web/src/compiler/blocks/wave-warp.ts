import type { BlockDef } from '../types';

export const WAVE_WARP: BlockDef = {
  type: 'wave_warp',
  category: 'distortion',
  friendlyName: 'Wave warp',
  icon: 'WaveTriangle',
  description: 'Sinusoidal UV displacement. Place above a shape block.',
  params: {
    direction: {
      kind: 'vec2',
      default: [1, 0] as const,
      label: 'direction',
      animatable: false,
    },
    amplitude: {
      kind: 'number',
      default: 0.1,
      min: 0,
      max: 1,
      step: 0.005,
      label: 'amplitude',
      animatable: true,
    },
    frequency: {
      kind: 'number',
      default: 5,
      min: 0,
      max: 25,
      step: 0.1,
      label: 'frequency',
      animatable: true,
    },
  },
  glsl:
    'uv += {{direction}} * sin(dot(uv, vec2(-{{direction}}.y, {{direction}}.x)) * {{frequency}}) * {{amplitude}};',
};
