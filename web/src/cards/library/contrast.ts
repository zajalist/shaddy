import type { CardDef } from '../types';

export const CONTRAST: CardDef = {
  type: 'contrast',
  category: 'effect',
  friendlyName: 'Contrast',
  description: 'Push values away from / toward 0.5 mid-grey.',
  icon: '◐',
  params: {
    amount: { kind: 'float', label: 'amount', default: 1, min: 0, max: 4, step: 0.05 },
  },
  snippetTemplate: 'col = (col - 0.5) * {{amount}} + 0.5;',
};
