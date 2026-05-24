// Cross-hatch pencil sketch — diagonal line patterns scaled by luminance.

import type { CardDef } from '../types';

export const SKETCH: CardDef = {
  type: 'sketch',
  category: 'effect',
  friendlyName: 'Sketch',
  description: 'Cross-hatch pencil-sketch look.',
  icon: '✏',
  params: {
    line_freq: { kind: 'float', label: 'line freq', default: 80, min: 10, max: 300, step: 1 },
    strength: { kind: 'float', label: 'strength', default: 0.7, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    float _lum = dot(col, vec3(0.299, 0.587, 0.114));
    vec2 _f = gl_FragCoord.xy;
    float _h1 = step(0.5, fract((_f.x + _f.y) / {{line_freq}}));
    float _h2 = step(0.5, fract((_f.x - _f.y) / {{line_freq}}));
    float _hatch = (_lum < 0.5 ? _h1 : 1.0) * (_lum < 0.25 ? _h2 : 1.0);
    col = mix(col, vec3(_hatch), {{strength}});
  }`,
};
