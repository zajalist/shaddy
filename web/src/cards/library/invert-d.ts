import type { CardDef } from '../types';

export const INVERT_D: CardDef = {
  type: 'invert_d',
  category: 'distortion',
  friendlyName: 'Invert d',
  description: 'd = 1 - d. Swap inside / outside of a shape.',
  icon: '⇄',
  params: {
    blend: { kind: 'float', label: 'blend', default: 1, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: 'd = mix(d, 1.0 - d, {{blend}});',
};
