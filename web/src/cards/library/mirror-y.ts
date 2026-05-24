import type { CardDef } from '../types';

export const MIRROR_Y: CardDef = {
  type: 'mirror_y',
  category: 'distortion',
  friendlyName: 'Mirror Y',
  description: 'Mirror across the X axis (reflect top ↔ bottom).',
  icon: '◨',
  params: {
    blend: { kind: 'float', label: 'blend', default: 1, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: 'uv.y = mix(uv.y, abs(uv.y), {{blend}});',
};
