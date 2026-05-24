import type { BlockDef } from '../types';

export const INVERT: BlockDef = {
  type: 'invert',
  category: 'color',
  friendlyName: 'Invert',
  icon: 'CircleHalf',
  description: 'Invert the colour. Amount controls a blend toward the inverse.',
  params: {
    amount: { kind: 'number', default: 1, min: 0, max: 1, step: 0.01, label: 'amount', animatable: true },
  },
  glsl: 'col = mix(col, vec3(1.0) - col, {{amount}});',
};
