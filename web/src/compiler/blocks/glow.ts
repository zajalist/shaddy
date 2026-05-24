import type { BlockDef } from '../types';

export const GLOW: BlockDef = {
  type: 'glow',
  category: 'effect',
  friendlyName: 'Glow',
  icon: 'Sun',
  description: 'Boost brightness where col is already bright (fake bloom — single pass).',
  params: {
    threshold: {
      kind: 'number',
      default: 0.55,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'threshold',
      animatable: true,
    },
    intensity: {
      kind: 'number',
      default: 1.2,
      min: 0,
      max: 4,
      step: 0.05,
      label: 'intensity',
      animatable: true,
    },
  },
  glsl: 'col += col * smoothstep({{threshold}}, 1.0, dot(col, vec3(0.299, 0.587, 0.114))) * {{intensity}};',
};
