import type { CardDef } from '../types';

export const SKEW: CardDef = {
  type: 'skew',
  category: 'distortion',
  friendlyName: 'Skew',
  description: 'Shear UV space.',
  icon: '⫻',
  params: {
    shear_x: { kind: 'float', label: 'shear x', default: 0, min: -2, max: 2, step: 0.01 },
    shear_y: { kind: 'float', label: 'shear y', default: 0, min: -2, max: 2, step: 0.01 },
  },
  snippetTemplate: 'uv = vec2(uv.x + uv.y * {{shear_x}}, uv.y + uv.x * {{shear_y}});',
};
