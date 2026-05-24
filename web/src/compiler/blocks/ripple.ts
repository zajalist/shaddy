import type { BlockDef } from '../types';

export const RIPPLE: BlockDef = {
  type: 'ripple',
  category: 'distortion',
  friendlyName: 'Ripple',
  icon: 'WaveSine',
  description: 'Sin-distort the running scalar into concentric bands.',
  params: {
    freq: {
      kind: 'number',
      default: 10,
      min: 0,
      max: 30,
      step: 0.1,
      label: 'frequency',
      animatable: true,
    },
    phase: {
      kind: 'number',
      default: 0,
      min: 0,
      max: 6.2832,
      step: 0.01,
      label: 'phase',
      animatable: true,
    },
  },
  glsl: 'd = sin(d * {{freq}} + {{phase}});',
};
