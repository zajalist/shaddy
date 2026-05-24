// Book of Shaders — Bernoulli lemniscate (figure-8) implicit curve.
// (x²+y²)² = a²(x²−y²)  →  d = |(x²+y²)² − a²(x²−y²)|

import type { CardDef } from '../types';

export const LEMNISCATE: CardDef = {
  type: 'lemniscate',
  category: 'shape',
  friendlyName: 'Lemniscate',
  description: 'Bernoulli figure-8 implicit curve.',
  icon: '∞',
  params: {
    size: { kind: 'float', label: 'size', default: 0.8, min: 0.2, max: 2, step: 0.01 },
    thickness: { kind: 'float', label: 'thickness', default: 0.05, min: 0.002, max: 0.3, step: 0.002 },
  },
  snippetTemplate: `{
    vec2 _p = uv;
    float _a2 = {{size}} * {{size}};
    float _s = dot(_p, _p);
    float _f = _s * _s - _a2 * (_p.x * _p.x - _p.y * _p.y);
    d = 1.0 - smoothstep({{thickness}}, {{thickness}} * 2.0, abs(_f));
  }`,
};
