import type { CardDef } from '../types';

export const NOISE_FIELD: CardDef = {
  type: 'noise_field',
  category: 'shape',
  friendlyName: 'Noise field',
  description: 'Smooth procedural noise across the canvas.',
  icon: '✺',
  params: {
    scale: { kind: 'float', label: 'scale', default: 4, min: 0.5, max: 20, step: 0.1 },
  },
  snippetTemplate: 'd = noise2(uv * {{scale}});',
  helpers: ['noise2'],
};
