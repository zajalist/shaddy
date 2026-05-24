// Mandelbrot iteration but instead of escape time we track the closest the
// orbit ever gets to a circular trap of radius `trap_r`. d = trap distance.

import type { CardDef } from '../types';

export const ORBIT_TRAP_CIRCLE: CardDef = {
  type: 'orbit_trap_circle',
  category: 'shape',
  friendlyName: 'Orbit trap (circle)',
  description: 'Mandelbrot with a circular orbit trap — silky banding.',
  icon: '⊙',
  params: {
    cx: { kind: 'float', label: 'centre x', default: -0.5, min: -2, max: 1, step: 0.005 },
    cy: { kind: 'float', label: 'centre y', default: 0, min: -1.5, max: 1.5, step: 0.005 },
    zoom: { kind: 'float', label: 'zoom', default: 1, min: 0.1, max: 20, step: 0.05 },
    trap_r: { kind: 'float', label: 'trap r', default: 0.5, min: 0.05, max: 2, step: 0.01 },
  },
  snippetTemplate: `{
    vec2 _c = uv * 1.5 / {{zoom}} + vec2({{cx}}, {{cy}});
    vec2 _z = vec2(0.0);
    float _minD = 1e9;
    const int N = 64;
    for (int i = 0; i < N; i++) {
      _z = vec2(_z.x * _z.x - _z.y * _z.y, 2.0 * _z.x * _z.y) + _c;
      float _td = abs(length(_z) - {{trap_r}});
      _minD = min(_minD, _td);
      if (dot(_z, _z) > 16.0) break;
    }
    d = clamp(_minD, 0.0, 1.0);
  }`,
};
