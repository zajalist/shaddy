// Moiré — two overlaid line gratings at slightly different angles.

import type { CardDef } from '../types';

export const MOIRE: CardDef = {
  type: 'moire',
  category: 'shape',
  friendlyName: 'Moiré',
  description: 'Two overlaid line gratings — beat-pattern bands.',
  icon: '⌇',
  params: {
    freq: { kind: 'float', label: 'freq', default: 30, min: 5, max: 80, step: 0.5 },
    offset: { kind: 'float', label: 'offset', default: 0.08, min: 0, max: 0.5, step: 0.005 },
  },
  snippetTemplate: `{
    float _a = step(0.5, fract(uv.x * {{freq}}));
    float _b = step(0.5, fract(uv.x * cos({{offset}}) * {{freq}} + uv.y * sin({{offset}}) * {{freq}}));
    d = _a * _b + (1.0 - _a) * (1.0 - _b);
  }`,
};
