// Pie wedge SDF (iq's sdfPie). The angle param controls the half-angle of
// the pie slice; c = vec2(sin(half), cos(half)) is built in the snippet.

import type { CardDef } from '../types';

export const PIE_SLICE: CardDef = {
  type: 'pie_slice',
  category: 'shape',
  friendlyName: 'Pie slice',
  description: 'Pie / wedge shape with adjustable opening angle.',
  icon: '🥧',
  params: {
    radius: { kind: 'float', label: 'radius', default: 0.7, min: 0.05, max: 2, step: 0.01 },
    angle: { kind: 'float', label: 'angle', default: 1.0, min: 0.05, max: 3.14, step: 0.01 },
    softness: { kind: 'float', label: 'softness', default: 0.02, min: 0, max: 0.5, step: 0.005 },
  },
  snippetTemplate: `{
    vec2 _c = vec2(sin({{angle}}), cos({{angle}}));
    d = 1.0 - smoothstep(-{{softness}}, {{softness}}, sdfPie(uv, _c, {{radius}}));
  }`,
  helpers: ['sdfPie'],
};
