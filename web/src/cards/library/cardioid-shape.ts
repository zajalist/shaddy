// Book of Shaders — cardioid (heart-curve) via polar r = a(1 - cos θ).

import type { CardDef } from '../types';

export const CARDIOID_SHAPE: CardDef = {
  type: 'cardioid_shape',
  category: 'shape',
  friendlyName: 'Cardioid',
  description: 'Polar heart curve r = a(1 − cos θ).',
  icon: '♡',
  params: {
    size: { kind: 'float', label: 'size', default: 0.45, min: 0.05, max: 1.5, step: 0.01 },
    thickness: { kind: 'float', label: 'thickness', default: 0.04, min: 0.002, max: 0.3, step: 0.002 },
  },
  snippetTemplate: `{
    vec2 _p = uv * vec2(1.0, -1.0);
    _p.y += {{size}};
    float _r = length(_p);
    float _a = atan(_p.y, _p.x);
    float _curve = {{size}} * (1.0 - cos(_a));
    d = 1.0 - smoothstep({{thickness}}, {{thickness}} * 1.8, abs(_r - _curve));
  }`,
};
