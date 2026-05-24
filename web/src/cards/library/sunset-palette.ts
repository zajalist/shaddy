// Themed cosine-palette preset — warm sunset.

import type { CardDef } from '../types';

export const SUNSET_PALETTE: CardDef = {
  type: 'sunset_palette',
  category: 'color',
  friendlyName: 'Sunset palette',
  description: 'Warm sunset preset — magenta → orange → cream.',
  icon: '🌅',
  params: {
    shift: { kind: 'float', label: 'shift', default: 0, min: -1, max: 1, step: 0.01 },
  },
  snippetTemplate:
    'col = cospal(clamp(d + {{shift}}, 0.0, 1.0), vec3(0.5, 0.3, 0.4), vec3(0.5, 0.5, 0.5), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.1, 0.2));',
  helpers: ['cospal'],
};
