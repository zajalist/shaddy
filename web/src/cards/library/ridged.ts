// Ridged multi-fractal — abs(signed-noise) summed at octaves. Mountain
// ridges, lightning, glass cracks.

import type { CardDef } from '../types';

export const RIDGED: CardDef = {
  type: 'ridged',
  category: 'shape',
  friendlyName: 'Ridged noise',
  description: 'Ridged multi-fractal — mountain ridges, glass cracks.',
  icon: '⛰',
  params: {
    scale: { kind: 'float', label: 'scale', default: 4, min: 0.5, max: 20, step: 0.1 },
  },
  snippetTemplate: 'd = ridged2(uv * {{scale}});',
  helpers: ['ridged2'],
};
