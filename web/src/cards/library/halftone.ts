// Newspaper halftone — dot pattern scaled by luminance.

import type { CardDef } from '../types';

export const HALFTONE: CardDef = {
  type: 'halftone',
  category: 'effect',
  friendlyName: 'Halftone',
  description: 'Newspaper halftone dots.',
  icon: '⣿',
  params: {
    scale: { kind: 'float', label: 'scale', default: 40, min: 5, max: 200, step: 1 },
    angle: { kind: 'float', label: 'angle', default: 0.5, min: 0, max: 3.14, step: 0.01 },
  },
  snippetTemplate: `{
    float _lum = dot(col, vec3(0.299, 0.587, 0.114));
    vec2 _p = rot2({{angle}}) * gl_FragCoord.xy / {{scale}};
    vec2 _g = fract(_p) - 0.5;
    float _dot = step(length(_g), sqrt(1.0 - _lum) * 0.5);
    col = mix(vec3(1.0), vec3(0.0), _dot);
  }`,
  helpers: ['rot2'],
};
