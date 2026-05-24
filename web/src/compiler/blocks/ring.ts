import type { BlockDef } from '../types';

export const RING: BlockDef = {
  type: 'ring',
  category: 'shape',
  friendlyName: 'Ring',
  icon: 'CircleDashed',
  description: 'Annulus at a given radius with a soft thickness.',
  params: {
    center: {
      kind: 'vec2',
      default: [0, 0] as const,
      label: 'centre',
      animatable: false,
    },
    radius: {
      kind: 'number',
      default: 0.5,
      min: 0,
      max: 2,
      step: 0.01,
      label: 'radius',
      animatable: true,
    },
    thickness: {
      kind: 'number',
      default: 0.05,
      min: 0.005,
      max: 1,
      step: 0.005,
      label: 'thickness',
      animatable: true,
    },
  },
  glsl:
    'd = 1.0 - smoothstep({{thickness}}, {{thickness}} + 0.05, abs(length(uv - {{center}}) - {{radius}}));',
};
