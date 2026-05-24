import type { CardDef } from '../types';

export const SOLID_COLOR: CardDef = {
  type: 'solid_color',
  category: 'color',
  friendlyName: 'Solid colour',
  description: 'Constant colour — ignores d entirely.',
  icon: '◼',
  params: {
    color: { kind: 'color', label: 'colour', default: [0.95, 0.55, 0.28] },
  },
  snippetTemplate: 'col = {{color}};',
};
