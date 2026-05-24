import type { CardDef } from '../types';

export const MIRROR_X: CardDef = {
  type: 'mirror_x',
  category: 'distortion',
  friendlyName: 'Mirror X',
  description: 'Mirror across the Y axis (reflect left ↔ right).',
  icon: '◧',
  params: {
    blend: { kind: 'float', label: 'blend', default: 1, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: 'uv.x = mix(uv.x, abs(uv.x), {{blend}});',
};
