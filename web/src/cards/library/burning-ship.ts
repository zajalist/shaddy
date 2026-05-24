// Burning Ship fractal: z = (|x| + i|y|)^2 + c. Same escape-time loop as
// Mandelbrot but the abs() per step gives the iconic flame silhouette.

import type { CardDef } from '../types';

export const BURNING_SHIP: CardDef = {
  type: 'burning_ship',
  category: 'shape',
  friendlyName: 'Burning ship',
  description: 'z = (|x| + i|y|)^2 + c — flame-like escape fractal.',
  icon: '🔥',
  params: {
    cx: { kind: 'float', label: 'centre x', default: -0.5, min: -2, max: 2, step: 0.005 },
    cy: { kind: 'float', label: 'centre y', default: -0.5, min: -2, max: 2, step: 0.005 },
    zoom: { kind: 'float', label: 'zoom', default: 1, min: 0.1, max: 20, step: 0.05 },
  },
  snippetTemplate: `{
    vec2 _c = uv * 1.5 / {{zoom}} + vec2({{cx}}, {{cy}});
    vec2 _z = vec2(0.0);
    float _it = 0.0;
    const int N = 64;
    for (int i = 0; i < N; i++) {
      _z = abs(_z);
      _z = vec2(_z.x * _z.x - _z.y * _z.y, 2.0 * _z.x * _z.y) + _c;
      if (dot(_z, _z) > 4.0) break;
      _it += 1.0;
    }
    d = _it / float(N);
  }`,
};
