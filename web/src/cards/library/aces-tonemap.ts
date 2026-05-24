// ACES filmic tonemap — Narkowicz's cheap approximation. Maps unbounded HDR
// colour into a pleasing [0..1] range with toe + shoulder.
//   col = clamp((col*(a*col+b)) / (col*(c*col+d)+e), 0, 1)

import type { CardDef } from '../types';

export const ACES_TONEMAP: CardDef = {
  type: 'aces_tonemap',
  category: 'effect',
  friendlyName: 'ACES tonemap',
  description: 'Filmic ACES tonemap (Narkowicz approximation).',
  icon: '🎞',
  params: {
    exposure: { kind: 'float', label: 'exposure', default: 1, min: 0, max: 4, step: 0.01 },
  },
  snippetTemplate: `{
    vec3 _x = col * {{exposure}};
    col = clamp((_x * (2.51 * _x + 0.03)) / (_x * (2.43 * _x + 0.59) + 0.14), 0.0, 1.0);
  }`,
};
