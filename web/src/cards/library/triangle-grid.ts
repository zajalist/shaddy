// Triangular lattice — equilateral triangle tiling.

import type { CardDef } from '../types';

export const TRIANGLE_GRID: CardDef = {
  type: 'triangle_grid',
  category: 'shape',
  friendlyName: 'Triangle grid',
  description: 'Equilateral triangle tiling.',
  icon: '▲',
  params: {
    scale: { kind: 'float', label: 'scale', default: 8, min: 1, max: 30, step: 0.1 },
    edge: { kind: 'float', label: 'edge', default: 0.06, min: 0.005, max: 0.3, step: 0.005 },
  },
  snippetTemplate: `{
    vec2 _p = uv * {{scale}};
    vec2 _q = vec2(_p.x - _p.y * 0.5773, _p.y * 1.1547);
    vec3 _b = fract(vec3(_q.x, _q.y, 1.0 - _q.x - _q.y));
    d = 1.0 - smoothstep({{edge}}, {{edge}} * 1.4, min(min(_b.x, _b.y), _b.z));
  }`,
};
