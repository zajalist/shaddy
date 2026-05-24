import type { BlockDef } from '../types';

export const CHECKER: BlockDef = {
  type: 'checker',
  category: 'shape',
  friendlyName: 'Checker',
  icon: 'Checkerboard',
  description: 'Checkerboard pattern.',
  params: {
    scale: { kind: 'number', default: 6, min: 1, max: 30, step: 0.1, label: 'scale', animatable: true },
  },
  glsl: 'd = step(0.5, mod(floor(uv.x * {{scale}}) + floor(uv.y * {{scale}}), 2.0));',
};
