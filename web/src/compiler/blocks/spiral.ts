import type { BlockDef } from '../types';

export const SPIRAL: BlockDef = {
  type: 'spiral',
  category: 'shape',
  friendlyName: 'Spiral',
  icon: 'SpinnerGap',
  description: 'Polar-coord spiral arms around the centre.',
  params: {
    arms: { kind: 'number', default: 4, min: 0, max: 20, step: 0.1, label: 'arms', animatable: true },
    twist: { kind: 'number', default: 3, min: -10, max: 10, step: 0.1, label: 'twist', animatable: true },
  },
  glsl: 'd = fract(atan(uv.y, uv.x) / 6.2831 * {{arms}} + length(uv) * {{twist}});',
};
