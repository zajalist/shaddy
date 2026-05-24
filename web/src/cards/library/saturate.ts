// Boost or kill saturation.

import type { CardDef } from '../types';

export const SATURATE: CardDef = {
  type: 'saturate',
  category: 'color',
  friendlyName: 'Saturate',
  description: 'Multiply current saturation. 0 → greyscale; >1 → more vivid.',
  icon: '🟪',
  params: {
    amount: { kind: 'float', label: 'amount', default: 1, min: 0, max: 3, step: 0.01 },
  },
  snippetTemplate: `{
    vec3 _hsv = rgb2hsv(col);
    _hsv.y = clamp(_hsv.y * {{amount}}, 0.0, 1.0);
    col = hsv2rgb(_hsv);
  }`,
  helpers: ['rgb2hsv', 'hsv2rgb'],
};
