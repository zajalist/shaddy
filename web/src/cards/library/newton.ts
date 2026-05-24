// Newton's method on z^3 - 1. Colours emerge from the angle of the converged
// root via d = atan(z.y, z.x) / 2π + 0.5 — feed into a palette card.

import type { CardDef } from '../types';

export const NEWTON: CardDef = {
  type: 'newton',
  category: 'shape',
  friendlyName: 'Newton fractal',
  description: "Newton's method on z^3 - 1 — root-basin colouring.",
  icon: '⊛',
  params: {
    zoom: { kind: 'float', label: 'zoom', default: 1, min: 0.1, max: 10, step: 0.05 },
    iter: { kind: 'float', label: 'iter', default: 20, min: 4, max: 40, step: 1 },
  },
  snippetTemplate: `{
    vec2 _z = uv * 1.5 / {{zoom}};
    const int N = 40;
    int _maxIt = int(clamp({{iter}}, 1.0, float(N)));
    for (int i = 0; i < N; i++) {
      if (i >= _maxIt) break;
      // z - (z^3 - 1) / (3 z^2)
      vec2 _z2 = vec2(_z.x * _z.x - _z.y * _z.y, 2.0 * _z.x * _z.y);
      vec2 _z3 = vec2(_z2.x * _z.x - _z2.y * _z.y, _z2.x * _z.y + _z2.y * _z.x);
      vec2 _num = _z3 - vec2(1.0, 0.0);
      vec2 _den = 3.0 * _z2;
      float _dd = dot(_den, _den) + 1e-8;
      vec2 _div = vec2(_num.x * _den.x + _num.y * _den.y, _num.y * _den.x - _num.x * _den.y) / _dd;
      _z = _z - _div;
    }
    d = atan(_z.y, _z.x) / 6.2831853 + 0.5;
  }`,
};
