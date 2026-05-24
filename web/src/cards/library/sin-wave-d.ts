// d = (sin(d * freq) + 1) / 2 — periodic ripple through any pattern.

import type { CardDef } from '../types';

export const SIN_WAVE_D: CardDef = {
  type: 'sin_wave_d',
  category: 'distortion',
  friendlyName: 'Sin-wave d',
  description: 'Run d through a sin wave — periodic ripple.',
  icon: '∿',
  params: {
    freq: { kind: 'float', label: 'freq', default: 6, min: 0, max: 40, step: 0.1 },
  },
  snippetTemplate: 'd = 0.5 + 0.5 * sin(d * {{freq}});',
};
