import type { BlockDef } from '../types';

export const KALEIDOSCOPE: BlockDef = {
  type: 'kaleidoscope',
  category: 'distortion',
  friendlyName: 'Kaleidoscope',
  icon: 'Diamond',
  description: 'Mirror UV space into N wedges. Place above a shape block.',
  params: {
    slices: { kind: 'number', default: 6, min: 2, max: 24, step: 1, label: 'slices', animatable: true },
  },
  glsl: '{ float _r = length(uv); float _a = atan(uv.y, uv.x); float _seg = 6.2831 / {{slices}}; _a = abs(mod(_a, _seg) - _seg * 0.5); uv = vec2(cos(_a), sin(_a)) * _r; }',
};
