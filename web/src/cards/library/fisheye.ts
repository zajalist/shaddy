// Radial fisheye distortion — bulge outward or pinch inward.

import type { CardDef } from '../types';

export const FISHEYE: CardDef = {
  type: 'fisheye',
  category: 'distortion',
  friendlyName: 'Fisheye',
  description: 'Bulge / pinch radial distortion. Negative pinches.',
  icon: '◉',
  params: {
    strength: { kind: 'float', label: 'strength', default: 0.5, min: -1, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    float _r = length(uv);
    float _f = 1.0 + {{strength}} * _r * _r;
    uv *= _f;
  }`,
};
