// F2 - F1 voronoi — produces cell-EDGE networks instead of solid cells.

import type { CardDef } from '../types';

export const WORLEY_EDGES: CardDef = {
  type: 'worley_edges',
  category: 'shape',
  friendlyName: 'Worley edges',
  description: 'Voronoi cell boundaries (F2 - F1).',
  icon: '⬢',
  params: {
    scale: { kind: 'float', label: 'scale', default: 5, min: 1, max: 20, step: 0.1 },
    sharpness: { kind: 'float', label: 'sharpness', default: 8, min: 1, max: 30, step: 0.5 },
  },
  snippetTemplate: `{
    vec2 _w = worley2(uv * {{scale}});
    d = 1.0 - smoothstep(0.0, 1.0 / {{sharpness}}, _w.y - _w.x);
  }`,
  helpers: ['worley2'],
};
