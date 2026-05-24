// pow-based smoothstep alternative — gives more control over the S-curve
// steepness than the built-in 3t² - 2t³. Higher `power` = harder edges.

import type { CardDef } from '../types';

export const CUBIC_SMOOTHSTEP: CardDef = {
  type: 'cubic_smoothstep',
  category: 'distortion',
  friendlyName: 'Cubic smoothstep',
  description: 'pow-curve smoothstep on d with adjustable steepness.',
  icon: '∽',
  params: {
    edge0: { kind: 'float', label: 'edge 0', default: 0.2, min: -1, max: 2, step: 0.01 },
    edge1: { kind: 'float', label: 'edge 1', default: 0.8, min: -1, max: 2, step: 0.01 },
    power: { kind: 'float', label: 'power', default: 2, min: 0.1, max: 8, step: 0.05 },
  },
  snippetTemplate: `{
    float _t = clamp((d - {{edge0}}) / ({{edge1}} - {{edge0}} + 1e-6), 0.0, 1.0);
    float _p = pow(_t, {{power}});
    d = _p * _p * (3.0 - 2.0 * _p);
  }`,
};
