// Wormhole — a perspective tunnel rushing inward: 1/r depth coordinate gives
// the rings an accelerating, sucked-in feel; rainbow palette by depth + angle,
// dark throat and a bright far light.

import type { CardDef } from '../types';

export const WORMHOLE: CardDef = {
  type: 'wormhole',
  category: 'shape',
  friendlyName: 'Wormhole',
  description: 'Perspective tunnel rushing inward — rainbow rings.',
  icon: '🕳',
  io: { reads: ['uv'], writes: ['d', 'col'] },
  params: {
    speed: { kind: 'float', label: 'speed', default: 1.0, min: 0, max: 4, step: 0.05 },
    rings: { kind: 'float', label: 'rings', default: 8, min: 1, max: 24, step: 0.5 },
    sides: { kind: 'float', label: 'sides', default: 6, min: 1, max: 16, step: 1 },
  },
  snippetTemplate: `{
    vec2 _p = uv;
    float _r = length(_p) + 1e-3;
    float _a = atan(_p.y, _p.x);
    float _depth = 1.0 / _r + u_time * {{speed}};
    float _ring = 0.5 + 0.5 * sin(_depth * {{rings}});
    float _swirl = 0.5 + 0.5 * sin(_a * {{sides}} + _depth * 0.5);
    float _v = _ring * _swirl;
    vec3 _c = 0.5 + 0.5 * cos(_depth * 0.5 + _a * 2.0 + vec3(0.0, 2.0, 4.0));
    _c *= 0.4 + 0.8 * _v;
    _c *= smoothstep(0.0, 0.12, _r);
    _c += vec3(0.6, 0.8, 1.0) * pow(max(0.0, 1.0 - _r * 3.0), 2.0) * 0.6;
    col = _c;
    d = _v;
  }`,
};
