// Book of Shaders — hash-driven checkerboard.
// step(threshold, hash21(floor(uv*N))) — random on/off per cell.

import type { CardDef } from '../types';

export const RANDOM_SQUARES: CardDef = {
  type: 'random_squares',
  category: 'shape',
  friendlyName: 'Random squares',
  description: 'Hash-driven random cells (Book of Shaders).',
  icon: '▦',
  params: {
    density: { kind: 'float', label: 'density', default: 10, min: 1, max: 50, step: 1 },
    threshold: { kind: 'float', label: 'threshold', default: 0.5, min: 0, max: 1, step: 0.01 },
    seed: { kind: 'float', label: 'seed', default: 0, min: 0, max: 100, step: 0.1 },
  },
  snippetTemplate: `{
    vec2 _ip = floor(uv * {{density}});
    d = step({{threshold}}, hash21(_ip + {{seed}}));
  }`,
  helpers: ['hash21'],
};
