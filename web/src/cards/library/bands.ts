// Quantize d into N discrete bands.

import type { CardDef } from '../types';

export const BANDS: CardDef = {
  type: 'bands',
  category: 'distortion',
  friendlyName: 'Bands',
  description: 'Quantise d into N discrete bands.',
  icon: '☱',
  params: {
    count: { kind: 'float', label: 'count', default: 6, min: 2, max: 32, step: 1 },
  },
  snippetTemplate: 'd = floor(clamp(d, 0.0, 0.9999) * {{count}}) / ({{count}} - 1.0);',
};
