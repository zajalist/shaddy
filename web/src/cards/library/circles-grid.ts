// Book of Shaders — circles in a tiled grid.
// fract(uv*N) tile then step(0.5, length(g - 0.5)).

import type { CardDef } from '../types';

export const CIRCLES_GRID: CardDef = {
  type: 'circles_grid',
  category: 'shape',
  friendlyName: 'Circles grid',
  description: 'Grid of circles via fract+length (Book of Shaders).',
  icon: '⊙',
  params: {
    density: { kind: 'float', label: 'density', default: 6, min: 1, max: 30, step: 0.1 },
    radius: { kind: 'float', label: 'radius', default: 0.35, min: 0.05, max: 0.5, step: 0.005 },
  },
  snippetTemplate: `{
    vec2 _g = fract(uv * {{density}}) - 0.5;
    d = 1.0 - smoothstep({{radius}} - 0.02, {{radius}} + 0.02, length(_g));
  }`,
};
