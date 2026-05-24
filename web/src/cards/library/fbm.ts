// Fractional Brownian motion — multi-octave value noise. Gives clouds,
// terrain, smoke; the canonical "organic noise" shape.

import type { CardDef } from '../types';

export const FBM: CardDef = {
  type: 'fbm',
  category: 'shape',
  friendlyName: 'fBm noise',
  description: 'Multi-octave noise — clouds, terrain, smoke.',
  icon: '☁',
  params: {
    scale: { kind: 'float', label: 'scale', default: 3, min: 0.5, max: 20, step: 0.1 },
    drift: { kind: 'float', label: 'drift', default: 0, min: 0, max: 2, step: 0.01 },
  },
  snippetTemplate: 'd = fbm2(uv * {{scale}} + vec2(u_time * {{drift}}));',
  helpers: ['fbm2'],
};
