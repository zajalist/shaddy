// Hexagonal tiling — d = distance to nearest hex centre, normalized.

import type { CardDef } from '../types';

export const HEX_GRID: CardDef = {
  type: 'hex_grid',
  category: 'shape',
  friendlyName: 'Hex grid',
  description: 'Tiled hexagonal grid.',
  icon: '⬢',
  params: {
    scale: { kind: 'float', label: 'scale', default: 8, min: 1, max: 30, step: 0.1 },
    edge: { kind: 'float', label: 'edge', default: 0.08, min: 0.01, max: 0.5, step: 0.005 },
  },
  snippetTemplate: `{
    vec2 _p = uv * {{scale}};
    vec2 _r = vec2(1.0, 1.7320508);
    vec2 _h = _r * 0.5;
    vec2 _a = mod(_p, _r) - _h;
    vec2 _b = mod(_p + _h, _r) - _h;
    vec2 _g = dot(_a, _a) < dot(_b, _b) ? _a : _b;
    d = 1.0 - smoothstep({{edge}}, {{edge}} * 1.4, length(_g));
  }`,
};
