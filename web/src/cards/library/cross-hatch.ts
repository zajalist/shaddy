// Book of Shaders — cross-hatch mesh: sin(uv.x*N) + sin(uv.y*N) thresholded.

import type { CardDef } from '../types';

export const CROSS_HATCH: CardDef = {
  type: 'cross_hatch',
  category: 'shape',
  friendlyName: 'Cross-hatch',
  description: 'sin·x + sin·y mesh thresholded.',
  icon: '#',
  params: {
    frequency: { kind: 'float', label: 'frequency', default: 12, min: 1, max: 60, step: 0.1 },
    threshold: { kind: 'float', label: 'threshold', default: 0.3, min: -1, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    float _v = sin(uv.x * {{frequency}}) + sin(uv.y * {{frequency}});
    d = smoothstep({{threshold}} - 0.05, {{threshold}} + 0.05, _v);
  }`,
};
