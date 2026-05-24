// Arabesque-style repeating curl motif — sin-driven scrollwork built on a
// tiled domain. Each tile produces a pair of opposite curls.

import type { CardDef } from '../types';

export const ARABESQUE_CURLS: CardDef = {
  type: 'arabesque_curls',
  category: 'shape',
  friendlyName: 'Arabesque curls',
  description: 'Repeating curling vine motif.',
  icon: '❦',
  params: {
    scale: { kind: 'float', label: 'scale', default: 3, min: 1, max: 12, step: 0.1 },
    twist: { kind: 'float', label: 'twist', default: 4, min: 1, max: 12, step: 0.1 },
    thickness: { kind: 'float', label: 'thickness', default: 0.07, min: 0.005, max: 0.3, step: 0.005 },
  },
  snippetTemplate: `{
    vec2 _p = fract(uv * {{scale}}) - 0.5;
    float _r = length(_p);
    float _a = atan(_p.y, _p.x);
    float _curl = sin({{twist}} * _a + _r * {{twist}} * 2.0);
    float _band = abs(_r - 0.3 - 0.12 * _curl);
    d = 1.0 - smoothstep({{thickness}}, {{thickness}} + 0.02, _band);
  }`,
};
