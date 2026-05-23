import type { CardDef } from '../types';

// `amount` lets you cross-fade between the original and the inverted colour.

export const INVERT: CardDef = {
  type: 'invert',
  category: 'color',
  friendlyName: 'Invert',
  description: 'Invert the colour. Amount controls a blend toward the inverse.',
  icon: '◐',
  params: {
    amount: { kind: 'float', label: 'amount', default: 1, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: 'col = mix(col, vec3(1.0) - col, {{amount}});',
};
