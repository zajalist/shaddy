import type { CardDef } from '../types';

export const DIM: CardDef = {
  type: 'dim',
  category: 'effect',
  friendlyName: 'Dim',
  description: 'Multiply colour by a scalar — fade to black or boost.',
  icon: '◐',
  params: {
    amount: { kind: 'float', label: 'amount', default: 1, min: 0, max: 3, step: 0.01 },
  },
  snippetTemplate: 'col *= {{amount}};',
};
