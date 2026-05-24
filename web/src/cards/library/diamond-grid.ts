// Repeating diamond tiles.

import type { CardDef } from '../types';

export const DIAMOND_GRID: CardDef = {
  type: 'diamond_grid',
  category: 'shape',
  friendlyName: 'Diamond grid',
  description: 'Repeating diamond tiles.',
  icon: '◆',
  params: {
    scale: { kind: 'float', label: 'scale', default: 6, min: 1, max: 30, step: 0.1 },
    width: { kind: 'float', label: 'width', default: 0.5, min: 0.05, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    vec2 _p = fract(uv * {{scale}}) - 0.5;
    d = 1.0 - smoothstep({{width}}, {{width}} + 0.02, abs(_p.x) + abs(_p.y));
  }`,
};
