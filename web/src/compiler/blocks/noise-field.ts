import type { BlockDef } from '../types';

export const NOISE_FIELD: BlockDef = {
  type: 'noise_field',
  category: 'shape',
  friendlyName: 'Noise field',
  icon: 'Sparkle',
  description: 'Smooth procedural noise across the canvas.',
  params: {
    scale: {
      kind: 'number',
      default: 4,
      min: 0.5,
      max: 20,
      step: 0.1,
      label: 'scale',
      animatable: true,
    },
  },
  glsl: 'd = noise(uv * {{scale}});',
  helpers: ['noise'],
};
