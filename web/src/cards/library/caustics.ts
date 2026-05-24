// Pseudo water-caustics — sum of bright-thresholded sin patterns.

import type { CardDef } from '../types';

export const CAUSTICS: CardDef = {
  type: 'caustics',
  category: 'shape',
  friendlyName: 'Caustics',
  description: 'Water caustics analog — bright reticulation.',
  icon: '〜',
  params: {
    scale: { kind: 'float', label: 'scale', default: 4, min: 1, max: 20, step: 0.1 },
    speed: { kind: 'float', label: 'speed', default: 0.4, min: 0, max: 2, step: 0.01 },
  },
  snippetTemplate: `{
    vec2 _p = uv * {{scale}};
    float _t = u_time * {{speed}};
    float _v = 0.0;
    for (int i = 0; i < 4; i++) {
      float _fi = float(i);
      _p += vec2(sin(_p.y + _t + _fi), cos(_p.x + _t * 1.3 + _fi)) * 0.4;
      _v += 1.0 / length(vec2(sin(_p.x), cos(_p.y)) * 1.5 + 1e-3);
    }
    d = pow(min(_v * 0.18, 1.0), 1.6);
  }`,
};
