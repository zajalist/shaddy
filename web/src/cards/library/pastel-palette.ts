import type { CardDef } from '../types';

export const PASTEL_PALETTE: CardDef = {
  type: 'pastel_palette',
  category: 'color',
  friendlyName: 'Pastel palette',
  description: 'Soft pinks / mints / lavenders.',
  icon: '🍡',
  params: {
    shift: { kind: 'float', label: 'shift', default: 0, min: -1, max: 1, step: 0.01 },
  },
  snippetTemplate:
    'col = cospal(clamp(d + {{shift}}, 0.0, 1.0), vec3(0.75, 0.7, 0.8), vec3(0.2, 0.2, 0.2), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.3, 0.6));',
  helpers: ['cospal'],
};
