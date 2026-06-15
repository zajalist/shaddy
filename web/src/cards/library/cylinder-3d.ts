// 3D capped cylinder — iq's vertical cylinder SDF, centred at origin.

import type { CardDef } from '../types';

export const CYLINDER_3D: CardDef = {
  type: 'cylinder_3d',
  category: 'shape',
  friendlyName: 'Cylinder (3D)',
  description: 'Capped vertical cylinder contribution to the raymarched scene.',
  icon: '🛢️',
  mode: '3d',
  helpers: ['sdfCylinder3'],
  params: {
    h: { kind: 'float', label: 'half-height', default: 0.6, min: 0.05, max: 3, step: 0.01 },
    r: { kind: 'float', label: 'radius',      default: 0.4, min: 0.05, max: 3, step: 0.01 },
  },
  snippetTemplate: '// cylinder_3d (3D) h={{h}} r={{r}}',
  contribution3d: {
    sdfExpr: 'sdfCylinder3(p, {{h}}, {{r}})',
  },
};
