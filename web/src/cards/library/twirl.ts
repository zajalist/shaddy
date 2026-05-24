// Localised rotation that falls off with distance — different feel from swirl.

import type { CardDef } from '../types';

export const TWIRL: CardDef = {
  type: 'twirl',
  category: 'distortion',
  friendlyName: 'Twirl',
  description: 'Rotation strength falls off with distance from a centre.',
  icon: '🌀',
  params: {
    cx: { kind: 'float', label: 'centre x', default: 0, min: -1, max: 1, step: 0.01 },
    cy: { kind: 'float', label: 'centre y', default: 0, min: -1, max: 1, step: 0.01 },
    strength: { kind: 'float', label: 'strength', default: 2, min: -8, max: 8, step: 0.05 },
    radius: { kind: 'float', label: 'radius', default: 0.6, min: 0.05, max: 2, step: 0.01 },
  },
  snippetTemplate: `{
    vec2 _q = uv - vec2({{cx}}, {{cy}});
    float _r = length(_q);
    float _a = {{strength}} * smoothstep({{radius}}, 0.0, _r);
    uv = rot2(_a) * _q + vec2({{cx}}, {{cy}});
  }`,
  helpers: ['rot2'],
};
