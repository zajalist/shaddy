import type { BlockDef } from '../types';

export const REPEAT: BlockDef = {
  type: 'repeat',
  category: 'distortion',
  friendlyName: 'Repeat',
  icon: 'GridFour',
  description: 'Tile UV space. Place above a shape block.',
  params: {
    count: {
      kind: 'number',
      default: 3,
      min: 1,
      max: 12,
      step: 0.1,
      label: 'count',
      animatable: true,
    },
  },
  glsl: 'uv = fract((uv * 0.5 + 0.5) * {{count}}) * 2.0 - 1.0;',
};
