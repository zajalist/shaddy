// Exponential distance fog — col = mix(col, fog_color, 1 - exp(-density * r)).
// More physical than the linear `fog` card: bright centre, falls into colour.

import type { CardDef } from '../types';

export const FOG_EXP: CardDef = {
  type: 'fog_exp',
  category: 'effect',
  friendlyName: 'Fog (exponential)',
  description: 'Exponential distance fog — physical falloff.',
  icon: '☁',
  params: {
    color: { kind: 'color', label: 'colour', default: [0.7, 0.75, 0.85] },
    density: { kind: 'float', label: 'density', default: 1.2, min: 0, max: 6, step: 0.05 },
  },
  snippetTemplate:
    'col = mix(col, {{color}}, 1.0 - exp(-{{density}} * length(uv)));',
};
