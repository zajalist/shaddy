import type { BlockDef } from '../types';

export const DOTS: BlockDef = {
  type: 'dots',
  category: 'shape',
  friendlyName: 'Dots',
  icon: 'DotsNine',
  description: 'Polka-dot grid.',
  params: {
    scale: { kind: 'number', default: 8, min: 1, max: 40, step: 0.1, label: 'scale', animatable: true },
    radius: { kind: 'number', default: 0.25, min: 0.02, max: 0.5, step: 0.005, label: 'radius', animatable: true },
  },
  glsl: 'd = 1.0 - smoothstep({{radius}} - 0.02, {{radius}} + 0.02, length(fract(uv * {{scale}}) - 0.5));',
};
