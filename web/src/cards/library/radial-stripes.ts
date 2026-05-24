// Book of Shaders — angular stripes from origin (adjustable-width spokes).

import type { CardDef } from '../types';

export const RADIAL_STRIPES: CardDef = {
  type: 'radial_stripes',
  category: 'shape',
  friendlyName: 'Radial stripes',
  description: 'Angular stripes from origin (adjustable width).',
  icon: '✺',
  params: {
    count: { kind: 'float', label: 'count', default: 12, min: 2, max: 60, step: 1 },
    width: { kind: 'float', label: 'width', default: 0.5, min: 0.05, max: 0.95, step: 0.01 },
  },
  snippetTemplate: `{
    float _a = atan(uv.y, uv.x) / 6.2831853 + 0.5;
    float _s = fract(_a * {{count}});
    d = step(_s, {{width}});
  }`,
};
