import type { CardDef } from '../types';

// Polar-coordinate mirror. Place ABOVE a shape card so the shape sees the
// kaleidoscoped UV space.

export const KALEIDOSCOPE: CardDef = {
  type: 'kaleidoscope',
  category: 'distortion',
  friendlyName: 'Kaleidoscope',
  description: 'Mirror UV space into N wedges around the centre. Place above a shape card.',
  icon: '◈',
  params: {
    slices: { kind: 'float', label: 'slices', default: 6, min: 2, max: 24, step: 1 },
  },
  snippetTemplate: `{
    float _r = length(uv);
    float _a = atan(uv.y, uv.x);
    float _seg = 6.2831 / {{slices}};
    _a = abs(mod(_a, _seg) - _seg * 0.5);
    uv = vec2(cos(_a), sin(_a)) * _r;
  }`,
};
