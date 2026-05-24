import type { BlockDef } from '../types';

export const RADIAL_GRADIENT: BlockDef = {
  type: 'radial_gradient',
  category: 'shape',
  friendlyName: 'Radial gradient',
  icon: 'Circle',
  description: 'Smooth distance falloff from a centre point.',
  params: {
    center: {
      kind: 'vec2',
      default: [0, 0] as const,
      min: -1,
      max: 1,
      label: 'centre',
      animatable: false,
    },
    softness: {
      kind: 'number',
      default: 1.0,
      min: 0.1,
      max: 3,
      step: 0.05,
      label: 'softness',
      animatable: true,
    },
  },
  glsl: 'd = 1.0 - length(uv - {{center}}) * {{softness}};',
};
