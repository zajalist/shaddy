// Julia-set escape time at a chosen c. Bounded iteration count for perf.

import type { CardDef } from '../types';

export const JULIA: CardDef = {
  type: 'julia',
  category: 'shape',
  friendlyName: 'Julia set',
  description: 'Julia fractal escape-time at a chosen c.',
  icon: 'ℑ',
  params: {
    cx: { kind: 'float', label: 'c.x', default: -0.7, min: -1.5, max: 1.5, step: 0.005 },
    cy: { kind: 'float', label: 'c.y', default: 0.27, min: -1.5, max: 1.5, step: 0.005 },
    zoom: { kind: 'float', label: 'zoom', default: 1, min: 0.1, max: 5, step: 0.05 },
  },
  snippetTemplate: `{
    vec2 _z = uv * 1.5 / {{zoom}};
    vec2 _c = vec2({{cx}}, {{cy}});
    float _it = 0.0;
    for (int i = 0; i < 64; i++) {
      _z = vec2(_z.x * _z.x - _z.y * _z.y, 2.0 * _z.x * _z.y) + _c;
      if (dot(_z, _z) > 4.0) break;
      _it += 1.0;
    }
    d = _it / 64.0;
  }`,
};
