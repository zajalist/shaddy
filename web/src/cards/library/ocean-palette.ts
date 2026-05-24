import type { CardDef } from '../types';

export const OCEAN_PALETTE: CardDef = {
  type: 'ocean_palette',
  category: 'color',
  friendlyName: 'Ocean palette',
  description: 'Deep teal → cyan → foam.',
  icon: '🌊',
  params: {
    shift: { kind: 'float', label: 'shift', default: 0, min: -1, max: 1, step: 0.01 },
  },
  snippetTemplate:
    'col = cospal(clamp(d + {{shift}}, 0.0, 1.0), vec3(0.0, 0.3, 0.4), vec3(0.1, 0.6, 0.6), vec3(1.0, 1.0, 1.0), vec3(0.3, 0.2, 0.2));',
  helpers: ['cospal'],
};
