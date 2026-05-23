import type { CardDef } from '../types';

export const STRIPES: CardDef = {
  type: 'stripes',
  category: 'shape',
  friendlyName: 'Stripes',
  description: 'Parallel bands at an angle.',
  icon: '▦',
  params: {
    angle: { kind: 'float', label: 'angle', default: 0, min: 0, max: 6.2831, step: 0.01 },
    frequency: { kind: 'float', label: 'frequency', default: 8, min: 1, max: 30, step: 0.1 },
  },
  snippetTemplate:
    'd = step(0.5, fract((uv.x * cos({{angle}}) + uv.y * sin({{angle}})) * {{frequency}}));',
};
