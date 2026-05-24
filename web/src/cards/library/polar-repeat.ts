// Rotational domain repetition — slices the plane into N angular wedges and
// folds the angle into one wedge. Place above a shape card for kaleidoscope.

import type { CardDef } from '../types';

export const POLAR_REPEAT: CardDef = {
  type: 'polar_repeat',
  category: 'distortion',
  friendlyName: 'Polar repeat',
  description: 'Slice UV into N angular wedges — kaleidoscope.',
  icon: '✳',
  params: {
    count: { kind: 'float', label: 'count', default: 6, min: 1, max: 32, step: 1 },
  },
  snippetTemplate: `{
    float _r = length(uv);
    float _a = atan(uv.y, uv.x);
    float _wedge = 6.2831853 / {{count}};
    _a = mod(_a + _wedge * 0.5, _wedge) - _wedge * 0.5;
    uv = vec2(cos(_a), sin(_a)) * _r;
  }`,
};
