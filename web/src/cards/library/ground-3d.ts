// 3D ground plane — an infinite horizontal plane at y = h.

import type { CardDef } from '../types';

export const GROUND_3D: CardDef = {
  type: 'ground_3d',
  category: 'shape',
  friendlyName: 'Ground (3D)',
  description: 'Infinite horizontal plane at the given height.',
  icon: '🟫',
  mode: '3d',
  params: {
    h: { kind: 'float', label: 'height', default: 0, min: -3, max: 3, step: 0.01 },
  },
  snippetTemplate: '// ground_3d (3D) h={{h}}',
  contribution3d: {
    sdfExpr: 'p.y - ({{h}})',
  },
};
