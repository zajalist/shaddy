// N-pointed star. `points` is integer-ish; the SDF math handles fractional
// values gracefully (visual interpolation between odd star configurations).

import type { CardDef } from '../types';

export const STAR: CardDef = {
  type: 'star',
  category: 'shape',
  friendlyName: 'Star',
  description: 'N-pointed star — try 5, 6, 8 points.',
  icon: '★',
  params: {
    size: { kind: 'float', label: 'size', default: 0.6, min: 0.05, max: 1.5, step: 0.01 },
    points: { kind: 'float', label: 'points', default: 5, min: 3, max: 12, step: 1 },
    sharpness: { kind: 'float', label: 'sharpness', default: 2.5, min: 1.5, max: 8, step: 0.1 },
  },
  snippetTemplate:
    'd = 1.0 - smoothstep(-0.005, 0.005, sdfStar(uv, {{size}}, int({{points}}), {{sharpness}}));',
  helpers: ['sdfStar'],
};
