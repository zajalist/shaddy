// Add fbm noise on top of the colour — texturizes flat areas.

import type { CardDef } from '../types';

export const OVERLAY_NOISE: CardDef = {
  type: 'overlay_noise',
  category: 'effect',
  friendlyName: 'Overlay noise',
  description: 'Texturize the colour with fbm noise.',
  icon: '∷',
  params: {
    scale: { kind: 'float', label: 'scale', default: 6, min: 0.5, max: 30, step: 0.1 },
    amount: { kind: 'float', label: 'amount', default: 0.1, min: 0, max: 1, step: 0.005 },
  },
  snippetTemplate: 'col += (fbm2(uv * {{scale}}) - 0.5) * {{amount}};',
  helpers: ['fbm2'],
};
