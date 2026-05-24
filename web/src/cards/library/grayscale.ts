// Luminance-weighted greyscale.

import type { CardDef } from '../types';

export const GRAYSCALE: CardDef = {
  type: 'grayscale',
  category: 'color',
  friendlyName: 'Grayscale',
  description: 'Convert to luminance-weighted greyscale.',
  icon: '◌',
  params: {
    amount: { kind: 'float', label: 'amount', default: 1, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: 'col = mix(col, vec3(dot(col, vec3(0.299, 0.587, 0.114))), {{amount}});',
};
