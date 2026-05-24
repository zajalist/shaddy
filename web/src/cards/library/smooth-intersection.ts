// Smooth-intersection between current d and a centred circle SDF — soft
// boolean AND. Like smooth_min_to_circle but with max-style fusion.

import type { CardDef } from '../types';

export const SMOOTH_INTERSECTION: CardDef = {
  type: 'smooth_intersection',
  category: 'distortion',
  friendlyName: 'Smooth intersection',
  description: 'Soft boolean AND with a centred circle SDF.',
  icon: '⌒',
  params: {
    circle_r: { kind: 'float', label: 'circle r', default: 0.5, min: 0.05, max: 1.5, step: 0.01 },
    softness: { kind: 'float', label: 'softness', default: 0.1, min: 0.001, max: 0.5, step: 0.005 },
  },
  snippetTemplate: `{
    float _cd = 1.0 - smoothstep(-0.005, 0.005, length(uv) - {{circle_r}});
    float _h = clamp(0.5 - 0.5 * (_cd - d) / ({{softness}}), 0.0, 1.0);
    d = mix(_cd, d, _h) + ({{softness}}) * _h * (1.0 - _h);
  }`,
};
