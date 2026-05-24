// Horseshoe SDF (iq's sdfHorseshoe). Angle controls the opening; r = radius
// of the arc; thickness + length build the cross-section of the band.

import type { CardDef } from '../types';

export const HORSESHOE: CardDef = {
  type: 'horseshoe',
  category: 'shape',
  friendlyName: 'Horseshoe',
  description: 'Horseshoe — open arc with rectangular cross-section.',
  icon: '🧲',
  params: {
    angle: { kind: 'float', label: 'angle', default: 1.2, min: 0.1, max: 3.14, step: 0.01 },
    radius: { kind: 'float', label: 'radius', default: 0.55, min: 0.05, max: 1.5, step: 0.01 },
    thickness: { kind: 'float', label: 'thickness', default: 0.12, min: 0.01, max: 0.6, step: 0.005 },
    length_extent: { kind: 'float', label: 'length', default: 0.18, min: 0.02, max: 0.8, step: 0.01 },
    softness: { kind: 'float', label: 'softness', default: 0.02, min: 0, max: 0.5, step: 0.005 },
  },
  snippetTemplate: `{
    vec2 _c = vec2(cos({{angle}}), sin({{angle}}));
    vec2 _w = vec2({{thickness}}, {{length_extent}});
    d = 1.0 - smoothstep(-{{softness}}, {{softness}}, sdfHorseshoe(uv, _c, {{radius}}, _w));
  }`,
  helpers: ['sdfHorseshoe'],
};
