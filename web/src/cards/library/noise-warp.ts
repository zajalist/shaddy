// Displace UV by fbm-noise — gentle organic warble. Heavier than swirl.

import type { CardDef } from '../types';

export const NOISE_WARP: CardDef = {
  type: 'noise_warp',
  category: 'distortion',
  friendlyName: 'Noise warp',
  description: 'Displace UV by fbm-noise. Place above a shape block.',
  icon: '🌊',
  params: {
    scale: { kind: 'float', label: 'scale', default: 3, min: 0.5, max: 15, step: 0.1 },
    strength: { kind: 'float', label: 'strength', default: 0.15, min: 0, max: 1, step: 0.005 },
  },
  snippetTemplate: 'uv += vec2(fbm2(uv * {{scale}}), fbm2(uv * {{scale}} + 31.0)) * {{strength}};',
  helpers: ['fbm2'],
};
