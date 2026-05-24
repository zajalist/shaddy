// 8x8 Bayer dither approximation — quantises while preserving apparent shade.

import type { CardDef } from '../types';

export const DITHER: CardDef = {
  type: 'dither',
  category: 'effect',
  friendlyName: 'Dither',
  description: 'Quantise with a Bayer-style dither pattern.',
  icon: '⠿',
  params: {
    levels: { kind: 'float', label: 'levels', default: 3, min: 2, max: 8, step: 1 },
  },
  snippetTemplate: `{
    vec2 _c = mod(gl_FragCoord.xy, 4.0);
    float _bayer = 0.25 * fract(dot(_c, vec2(0.7548776, 0.5698402)) * 17.0);
    col = floor(col * {{levels}} + _bayer) / ({{levels}} - 1.0);
  }`,
};
