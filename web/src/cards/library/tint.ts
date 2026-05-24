import type { CardDef } from '../types';

export const TINT: CardDef = {
  type: 'tint',
  category: 'effect',
  friendlyName: 'Tint',
  description: 'Mix colour toward a target tint.',
  icon: '🎨',
  params: {
    color: { kind: 'color', label: 'tint', default: [1, 0.7, 0.5] },
    amount: { kind: 'float', label: 'amount', default: 0.3, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: 'col = mix(col, col * {{color}} * 2.0, {{amount}});',
};
