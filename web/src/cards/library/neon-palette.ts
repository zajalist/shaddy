import type { CardDef } from '../types';

export const NEON_PALETTE: CardDef = {
  type: 'neon_palette',
  category: 'color',
  friendlyName: 'Neon palette',
  description: 'Saturated electric colours.',
  icon: '💡',
  params: {
    shift: { kind: 'float', label: 'shift', default: 0, min: -1, max: 1, step: 0.01 },
  },
  snippetTemplate:
    'col = cospal(clamp(d + {{shift}}, 0.0, 1.0), vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(2.0, 1.0, 1.0), vec3(0.0, 0.25, 0.5));',
  helpers: ['cospal'],
};
