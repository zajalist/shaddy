import type { CardDef } from '../types';

export const SCALE_UV: CardDef = {
  type: 'scale_uv',
  category: 'distortion',
  friendlyName: 'Scale UV',
  description: 'Zoom UV space by separate x and y factors. Place above a shape.',
  icon: '⤢',
  params: {
    sx: { kind: 'float', label: 'scale x', default: 1, min: 0.05, max: 5, step: 0.01 },
    sy: { kind: 'float', label: 'scale y', default: 1, min: 0.05, max: 5, step: 0.01 },
  },
  snippetTemplate: 'uv /= vec2({{sx}}, {{sy}});',
};
