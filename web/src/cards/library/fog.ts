// Distance-from-center fog tint.

import type { CardDef } from '../types';

export const FOG: CardDef = {
  type: 'fog',
  category: 'effect',
  friendlyName: 'Fog',
  description: 'Tint everything by distance — atmospheric depth.',
  icon: '🌫',
  params: {
    color: { kind: 'color', label: 'colour', default: [0.7, 0.75, 0.85] },
    density: { kind: 'float', label: 'density', default: 0.5, min: 0, max: 2, step: 0.01 },
  },
  snippetTemplate: 'col = mix(col, {{color}}, clamp(length(uv) * {{density}}, 0.0, 1.0));',
};
