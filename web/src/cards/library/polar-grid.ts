// Book of Shaders — polar grid: angular spokes + radial concentric lines.

import type { CardDef } from '../types';

export const POLAR_GRID: CardDef = {
  type: 'polar_grid',
  category: 'shape',
  friendlyName: 'Polar grid',
  description: 'Angle + radius grid lines.',
  icon: '⊕',
  params: {
    spokes: { kind: 'float', label: 'spokes', default: 12, min: 2, max: 48, step: 1 },
    rings: { kind: 'float', label: 'rings', default: 6, min: 1, max: 20, step: 0.5 },
    thickness: { kind: 'float', label: 'thickness', default: 0.04, min: 0.005, max: 0.3, step: 0.005 },
  },
  snippetTemplate: `{
    float _r = length(uv);
    float _a = atan(uv.y, uv.x);
    float _spoke = abs(fract(_a / 6.2831853 * {{spokes}}) - 0.5) * 2.0;
    float _ring = abs(fract(_r * {{rings}}) - 0.5) * 2.0;
    float _grid = min(_spoke, _ring);
    d = 1.0 - smoothstep(1.0 - {{thickness}}, 1.0, _grid);
  }`,
};
