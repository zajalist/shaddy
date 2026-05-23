import type { CardDef } from '../types';

// Cellular pattern: distance to the nearest jittered cell-grid seed.

export const VORONOI_CELLS: CardDef = {
  type: 'voronoi_cells',
  category: 'shape',
  friendlyName: 'Voronoi cells',
  description: 'Cellular noise — distance to nearest scattered seed.',
  icon: '⬡',
  params: {
    scale: { kind: 'float', label: 'scale', default: 4, min: 1, max: 20, step: 0.1 },
    jitter: { kind: 'float', label: 'jitter', default: 1, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    vec2 _vp = uv * {{scale}};
    vec2 _vi = floor(_vp);
    vec2 _vf = fract(_vp);
    float _vd = 1.4142;
    for (int _y = -1; _y <= 1; _y++) {
      for (int _x = -1; _x <= 1; _x++) {
        vec2 _vg = vec2(float(_x), float(_y));
        vec2 _site = hash22(_vi + _vg) * {{jitter}};
        _vd = min(_vd, length(_vg + _site - _vf));
      }
    }
    d = _vd;
  }`,
  helpers: ['hash22'],
};
