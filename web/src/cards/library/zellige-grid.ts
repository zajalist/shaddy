// Zellige-style interlocking tiles — quadrilateral cells in a 4-colour
// rotation driven by a tile-id hash. Outputs `d` from the tile id so the
// downstream colour card can map it (a palette card placed after will
// recolour the four groups).

import type { CardDef } from '../types';

export const ZELLIGE_GRID: CardDef = {
  type: 'zellige_grid',
  category: 'shape',
  friendlyName: 'Zellige grid',
  description: 'Quadrilateral tile grid with hash-driven 4-tone rotation.',
  icon: '◆',
  params: {
    scale: { kind: 'float', label: 'scale', default: 5, min: 1, max: 24, step: 0.1 },
    grout: { kind: 'float', label: 'grout', default: 0.06, min: 0, max: 0.3, step: 0.005 },
  },
  snippetTemplate: `{
    vec2 _p = uv * {{scale}};
    vec2 _ip = floor(_p);
    vec2 _fp = fract(_p) - 0.5;
    float _tile = floor(hash21(_ip) * 4.0) / 3.0;
    float _edge = max(abs(_fp.x), abs(_fp.y));
    float _g = 1.0 - smoothstep(0.5 - {{grout}}, 0.5, _edge);
    d = _tile * _g;
  }`,
  helpers: ['hash21'],
};
