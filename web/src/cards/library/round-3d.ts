// 3D round — inflates the accumulated surface by `r`, rounding off edges and
// corners (iq opRound: d - r).

import type { CardDef } from '../types';

export const ROUND_3D: CardDef = {
  type: 'round_3d',
  category: 'distortion',
  friendlyName: 'Round',
  description: 'Round off the edges of the accumulated scene.',
  icon: '🔘',
  mode: '3d',
  params: {
    r: { kind: 'float', label: 'radius', default: 0.1, min: 0, max: 1, step: 0.005 },
  },
  snippetTemplate: '// round_3d (3D) r={{r}}',
  contribution3d: {
    sdfStmt: 'd -= {{r}};',
  },
};
