// 6-point Islamic star — hexagonal rosette.
// Star-of-David polar overlay inside a hex-tile domain.

import type { CardDef } from '../types';

export const ISLAMIC_6PT_STAR: CardDef = {
  type: 'islamic_6pt_star',
  category: 'shape',
  friendlyName: 'Islamic 6-pt star',
  description: 'Hexagonal 6-fold star rosette.',
  icon: '✡',
  params: {
    scale: { kind: 'float', label: 'scale', default: 3, min: 1, max: 12, step: 0.1 },
    sharpness: { kind: 'float', label: 'sharpness', default: 2.5, min: 1.5, max: 6, step: 0.1 },
    edge: { kind: 'float', label: 'edge', default: 0.015, min: 0.002, max: 0.2, step: 0.002 },
  },
  snippetTemplate: `{
    vec2 _p = uv * {{scale}};
    vec2 _r = vec2(1.0, 1.7320508);
    vec2 _h = _r * 0.5;
    vec2 _a = mod(_p, _r) - _h;
    vec2 _b = mod(_p + _h, _r) - _h;
    vec2 _g = dot(_a, _a) < dot(_b, _b) ? _a : _b;
    float _sd = sdfStar(_g, 0.45, 6, {{sharpness}});
    d = 1.0 - smoothstep(-{{edge}}, {{edge}}, _sd);
  }`,
  helpers: ['sdfStar'],
};
