// Gem field — Voronoi cells shaded as faceted crystals: each cell a distinct
// gem hue, darkened toward its edges (F2-F1) with a bright specular seam, and
// lit by distance to the cell centre so facets catch the light.

import type { CardDef } from '../types';

export const GEMFIELD: CardDef = {
  type: 'gemfield',
  category: 'shape',
  friendlyName: 'Crystals',
  description: 'Voronoi gems — faceted cells with lit edges.',
  icon: '💎',
  io: { reads: ['uv'], writes: ['d', 'col'] },
  params: {
    scale: { kind: 'float', label: 'scale', default: 4, min: 1, max: 14, step: 0.1 },
    drift: { kind: 'float', label: 'drift', default: 0.03, min: 0, max: 0.4, step: 0.005 },
  },
  snippetTemplate: `{
    vec2 _q = uv * {{scale}} + vec2(u_time * {{drift}}, 0.0);
    vec2 _ip = floor(_q), _fp = fract(_q);
    float _f1 = 8.0, _f2 = 8.0; vec2 _cell = vec2(0.0);
    for (int _y = -1; _y <= 1; _y++) for (int _x = -1; _x <= 1; _x++) {
      vec2 _g = vec2(float(_x), float(_y));
      vec2 _o = hash22(_ip + _g);
      float _dd = length(_g + _o - _fp);
      if (_dd < _f1) { _f2 = _f1; _f1 = _dd; _cell = _ip + _g; }
      else if (_dd < _f2) { _f2 = _dd; }
    }
    float _edge = smoothstep(0.0, 0.07, _f2 - _f1);
    float _ch = hash21(_cell);
    vec3 _gem = 0.45 + 0.55 * cos(6.2831 * (_ch + vec3(0.0, 0.33, 0.66)));
    vec3 _c = _gem * (0.4 + 0.7 * smoothstep(0.0, 0.5, _f1));
    _c *= 0.45 + 0.55 * _edge;
    _c += vec3(1.0) * pow(1.0 - _edge, 8.0) * 0.35;
    col = _c;
    d = _edge;
  }`,
  helpers: ['hash22', 'hash21'],
};
