import type { CardDef } from '../types';

export const GAMMA: CardDef = {
  type: 'gamma',
  category: 'effect',
  friendlyName: 'Gamma',
  description: 'Per-channel pow(col, 1 / gamma).',
  icon: 'γ',
  params: {
    gamma: { kind: 'float', label: 'gamma', default: 1, min: 0.1, max: 4, step: 0.01 },
  },
  snippetTemplate: 'col = pow(max(col, 0.0), vec3(1.0 / {{gamma}}));',
};
