// Book of Shaders — grid of round dots with adjustable radius & spacing.

import type { CardDef } from '../types';

export const DOT_GRID_2: CardDef = {
  type: 'dot_grid_2',
  category: 'shape',
  friendlyName: 'Dot grid',
  description: 'Grid of circular dots with adjustable radius.',
  icon: '⋮⋮',
  params: {
    spacing: { kind: 'float', label: 'spacing', default: 8, min: 1, max: 30, step: 0.1 },
    radius: { kind: 'float', label: 'radius', default: 0.25, min: 0.02, max: 0.5, step: 0.005 },
  },
  snippetTemplate: `{
    vec2 _g = fract(uv * {{spacing}}) - 0.5;
    d = 1.0 - smoothstep({{radius}} - 0.02, {{radius}} + 0.02, length(_g));
  }`,
};
