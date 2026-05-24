// Parallelogram SDF (iq's sdfParallelogram). wi = half-width, he = half-height,
// sk = skew along x at top edge.

import type { CardDef } from '../types';

export const PARALLELOGRAM: CardDef = {
  type: 'parallelogram',
  category: 'shape',
  friendlyName: 'Parallelogram',
  description: 'Skewed rectangle — parallelogram SDF.',
  icon: '▱',
  params: {
    width: { kind: 'float', label: 'width', default: 0.6, min: 0.05, max: 1.5, step: 0.01 },
    height: { kind: 'float', label: 'height', default: 0.4, min: 0.05, max: 1.5, step: 0.01 },
    skew: { kind: 'float', label: 'skew', default: 0.25, min: -1, max: 1, step: 0.01 },
    softness: { kind: 'float', label: 'softness', default: 0.02, min: 0, max: 0.5, step: 0.005 },
  },
  snippetTemplate:
    'd = 1.0 - smoothstep(-{{softness}}, {{softness}}, sdfParallelogram(uv, {{width}}, {{height}}, {{skew}}));',
  helpers: ['sdfParallelogram'],
};
