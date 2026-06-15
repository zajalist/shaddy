// 3D octahedron — iq's bound octahedron SDF, centred at origin.

import type { CardDef } from '../types';

export const OCTAHEDRON_3D: CardDef = {
  type: 'octahedron_3d',
  category: 'shape',
  friendlyName: 'Octahedron (3D)',
  description: 'Octahedron contribution to the raymarched scene.',
  icon: '🔶',
  mode: '3d',
  helpers: ['sdfOctahedron3'],
  params: {
    s: { kind: 'float', label: 'radius', default: 0.7, min: 0.05, max: 3, step: 0.01 },
  },
  snippetTemplate: '// octahedron_3d (3D) s={{s}}',
  contribution3d: {
    sdfExpr: 'sdfOctahedron3(p, {{s}})',
  },
};
