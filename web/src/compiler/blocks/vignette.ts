import type { BlockDef } from '../types';

export const VIGNETTE: BlockDef = {
  type: 'vignette',
  category: 'effect',
  friendlyName: 'Vignette',
  icon: 'CircleHalf',
  description: 'Darken the corners.',
  params: {
    inner: {
      kind: 'number',
      default: 0.5,
      min: 0,
      max: 2,
      step: 0.01,
      label: 'inner',
      animatable: true,
    },
    outer: {
      kind: 'number',
      default: 1.5,
      min: 0,
      max: 2,
      step: 0.01,
      label: 'outer',
      animatable: true,
    },
  },
  glsl: 'col *= 1.0 - smoothstep({{inner}}, {{outer}}, length(uv));',
};
