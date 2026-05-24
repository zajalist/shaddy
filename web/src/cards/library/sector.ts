// Pie-slice sector — circular wedge from origin.

import type { CardDef } from '../types';

export const SECTOR: CardDef = {
  type: 'sector',
  category: 'shape',
  friendlyName: 'Sector',
  description: 'Pie-slice sector.',
  icon: '◔',
  params: {
    radius: { kind: 'float', label: 'radius', default: 0.6, min: 0.05, max: 1.5, step: 0.01 },
    sweep: { kind: 'float', label: 'sweep', default: 2.0, min: 0.05, max: 6.2832, step: 0.05 },
    rotation: { kind: 'float', label: 'rotation', default: 0, min: -6.2832, max: 6.2832, step: 0.05 },
  },
  snippetTemplate: `{
    float _r = length(uv);
    float _a = mod(atan(uv.y, uv.x) - {{rotation}} + 3.14159, 6.28318) - 3.14159;
    float _in_angle = step(abs(_a), {{sweep}} * 0.5);
    float _in_radius = 1.0 - smoothstep({{radius}}, {{radius}} + 0.01, _r);
    d = _in_angle * _in_radius;
  }`,
};
