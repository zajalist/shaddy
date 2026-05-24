import type { BlockDef } from '../types';

export const ROTATE: BlockDef = {
  type: 'rotate',
  category: 'distortion',
  friendlyName: 'Rotate',
  icon: 'ArrowClockwise',
  description: 'Rotate UV space by an angle. Place above a shape block.',
  params: {
    angle: { kind: 'number', default: 0, min: -6.2831, max: 6.2831, step: 0.01, label: 'angle', animatable: true },
  },
  glsl: 'uv = rotate2d({{angle}}) * uv;',
  helpers: ['rotate2d'],
};
