// Book of Shaders — straight stripes warped by a sin wave.

import type { CardDef } from '../types';

export const WAVY_STRIPES: CardDef = {
  type: 'wavy_stripes',
  category: 'shape',
  friendlyName: 'Wavy stripes',
  description: 'Stripes warped by a sin field.',
  icon: '≋',
  params: {
    frequency: { kind: 'float', label: 'frequency', default: 8, min: 1, max: 40, step: 0.1 },
    amplitude: { kind: 'float', label: 'amplitude', default: 0.2, min: 0, max: 1, step: 0.005 },
    wave: { kind: 'float', label: 'wave freq', default: 4, min: 0.1, max: 20, step: 0.1 },
  },
  snippetTemplate: `{
    float _x = uv.x + sin(uv.y * {{wave}}) * {{amplitude}};
    d = step(0.5, fract(_x * {{frequency}}));
  }`,
};
