// Random Truchet tiles — quarter-arcs in randomly-rotated cells.
// Classic generative-art pattern.

import type { CardDef } from '../types';

export const TRUCHET: CardDef = {
  type: 'truchet',
  category: 'shape',
  friendlyName: 'Truchet',
  description: 'Random arc tiling — pretty connected curves.',
  icon: '◠',
  params: {
    scale: { kind: 'float', label: 'scale', default: 6, min: 1, max: 30, step: 0.1 },
    thickness: { kind: 'float', label: 'thickness', default: 0.1, min: 0.01, max: 0.45, step: 0.005 },
  },
  snippetTemplate: `{
    vec2 _p = uv * {{scale}};
    vec2 _ip = floor(_p);
    vec2 _fp = fract(_p);
    if (hash21(_ip) > 0.5) _fp.x = 1.0 - _fp.x;
    float _d1 = length(_fp);
    float _d2 = length(_fp - vec2(1.0));
    float _r = min(abs(_d1 - 0.5), abs(_d2 - 0.5));
    d = 1.0 - smoothstep({{thickness}}, {{thickness}} + 0.02, _r);
  }`,
  helpers: ['hash21'],
};
