// Smooth-min the current shape's d with a centred circle SDF. Acts as a
// soft union with a built-in ring. The recipe schema doesn't (yet) support
// passing one card's d into another as a parameter, so the second operand
// is hard-baked as a circle of radius `circle_r`.

import type { CardDef } from '../types';

export const SMOOTH_MIN_TO_CIRCLE: CardDef = {
  type: 'smooth_min_to_circle',
  category: 'distortion',
  friendlyName: 'Smooth-min → circle',
  description: 'Soft-merge current d with a centred circle SDF.',
  icon: '⌬',
  params: {
    circle_r: { kind: 'float', label: 'circle r', default: 0.4, min: 0.05, max: 1.5, step: 0.01 },
    softness: { kind: 'float', label: 'softness', default: 0.1, min: 0.001, max: 0.5, step: 0.005 },
  },
  snippetTemplate: `{
    float _cd = 1.0 - smoothstep(-0.005, 0.005, length(uv) - {{circle_r}});
    float _h = clamp(0.5 + 0.5 * (_cd - d) / ({{softness}}), 0.0, 1.0);
    d = mix(_cd, d, _h) - ({{softness}}) * _h * (1.0 - _h);
  }`,
};
