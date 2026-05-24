// Radial sunburst / spokes from origin.

import type { CardDef } from '../types';

export const SUNBURST: CardDef = {
  type: 'sunburst',
  category: 'shape',
  friendlyName: 'Sunburst',
  description: 'Radial spokes from the centre.',
  icon: '☀',
  params: {
    spokes: { kind: 'float', label: 'spokes', default: 12, min: 1, max: 60, step: 1 },
    softness: { kind: 'float', label: 'softness', default: 0.5, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: 'd = pow(0.5 + 0.5 * cos(atan(uv.y, uv.x) * {{spokes}}), mix(8.0, 1.0, {{softness}}));',
};
