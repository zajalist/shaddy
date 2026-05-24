// Book of Shaders — triangular Truchet tiling.
// Like classic truchet but with diagonal triangles instead of arcs.

import type { CardDef } from '../types';

export const TRUCHET_TRIS: CardDef = {
  type: 'truchet_tris',
  category: 'shape',
  friendlyName: 'Truchet triangles',
  description: 'Truchet tiling with triangle halves (Book of Shaders).',
  icon: '◣',
  params: {
    scale: { kind: 'float', label: 'scale', default: 6, min: 1, max: 30, step: 0.1 },
    edge: { kind: 'float', label: 'edge', default: 0.02, min: 0.001, max: 0.2, step: 0.001 },
  },
  snippetTemplate: `{
    vec2 _p = uv * {{scale}};
    vec2 _ip = floor(_p);
    vec2 _fp = fract(_p);
    float _flip = step(0.5, hash21(_ip));
    float _diag = mix(_fp.x + _fp.y - 1.0, _fp.x - _fp.y, _flip);
    d = smoothstep(-{{edge}}, {{edge}}, _diag);
  }`,
  helpers: ['hash21'],
};
