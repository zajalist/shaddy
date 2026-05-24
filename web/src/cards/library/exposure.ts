// Photographic exposure — multiplies by 2^stops then tone-maps with Reinhard.

import type { CardDef } from '../types';

export const EXPOSURE: CardDef = {
  type: 'exposure',
  category: 'effect',
  friendlyName: 'Exposure',
  description: 'Photographic exposure (stops) with Reinhard tonemap.',
  icon: '☀',
  params: {
    stops: { kind: 'float', label: 'stops', default: 0, min: -4, max: 4, step: 0.05 },
  },
  snippetTemplate: `{
    col *= pow(2.0, {{stops}});
    col = col / (1.0 + col);
  }`,
};
