// 2D analog of the Mandelbulb: z = z^n + c. For n=2 it's classic Mandelbrot;
// higher n produces multi-lobed "bulb" silhouettes.

import type { CardDef } from '../types';

export const MANDELBULB_2D: CardDef = {
  type: 'mandelbulb_2d',
  category: 'shape',
  friendlyName: 'Mandelbulb 2D',
  description: '2D z = z^n + c — multi-bulb fractal silhouettes.',
  icon: '🌸',
  params: {
    power: { kind: 'float', label: 'power n', default: 6, min: 2, max: 12, step: 0.1 },
    zoom: { kind: 'float', label: 'zoom', default: 1, min: 0.1, max: 10, step: 0.05 },
  },
  snippetTemplate: `{
    vec2 _c = uv * 1.5 / {{zoom}};
    vec2 _z = vec2(0.0);
    float _it = 0.0;
    const int N = 64;
    for (int i = 0; i < N; i++) {
      float _r = length(_z);
      float _a = atan(_z.y, _z.x) * {{power}};
      _z = pow(_r, {{power}}) * vec2(cos(_a), sin(_a)) + _c;
      if (dot(_z, _z) > 4.0) break;
      _it += 1.0;
    }
    d = _it / float(N);
  }`,
};
