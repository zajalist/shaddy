import type { BlockDef } from '../types';

export const PIXELATE: BlockDef = {
  type: 'pixelate',
  category: 'distortion',
  friendlyName: 'Pixelate',
  icon: 'Squares',
  description: 'Snap UV space to a grid. Place above a shape block.',
  params: {
    grid: { kind: 'number', default: 20, min: 4, max: 100, step: 1, label: 'grid', animatable: true },
  },
  glsl: 'uv = floor(uv * {{grid}}) / {{grid}};',
};
