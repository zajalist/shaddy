// Classic 8-point Islamic star — octagram tiling.
// Tile the plane, build an 8-fold star SDF per tile, plus a smaller
// rotated square to fill the interstices.

import type { CardDef } from '../types';

export const ISLAMIC_8PT_STAR: CardDef = {
  type: 'islamic_8pt_star',
  category: 'shape',
  friendlyName: 'Islamic 8-pt star',
  description: 'Tiled 8-point star with square infill — octagram.',
  icon: '✶',
  params: {
    scale: { kind: 'float', label: 'scale', default: 3, min: 1, max: 12, step: 0.1 },
    edge: { kind: 'float', label: 'edge', default: 0.015, min: 0.002, max: 0.2, step: 0.002 },
  },
  snippetTemplate: `{
    vec2 _p = fract(uv * {{scale}}) - 0.5;
    float _star = sdfStar(_p, 0.42, 8, 3.0);
    vec2 _q = rot2(0.7853982) * _p;
    float _sq = sdfBox(_q, vec2(0.16));
    float _sd = min(_star, _sq);
    d = 1.0 - smoothstep(-{{edge}}, {{edge}}, _sd);
  }`,
  helpers: ['sdfStar', 'sdfBox', 'rot2'],
};
