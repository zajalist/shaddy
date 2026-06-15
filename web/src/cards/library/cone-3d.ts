// 3D capped cone — iq's cone SDF (axis on y), centred at origin.

import type { CardDef } from '../types';

export const CONE_3D: CardDef = {
  type: 'cone_3d',
  category: 'shape',
  friendlyName: 'Cone (3D)',
  description: 'Capped cone contribution to the raymarched scene.',
  icon: '🔺',
  mode: '3d',
  helpers: ['sdfCone3'],
  params: {
    h:  { kind: 'float', label: 'half-height',   default: 0.6, min: 0.05, max: 3, step: 0.01 },
    r1: { kind: 'float', label: 'bottom radius', default: 0.5, min: 0,    max: 3, step: 0.01 },
    r2: { kind: 'float', label: 'top radius',    default: 0,   min: 0,    max: 3, step: 0.01 },
  },
  snippetTemplate: '// cone_3d (3D) h={{h}} r1={{r1}} r2={{r2}}',
  contribution3d: {
    sdfExpr: 'sdfCone3(p, {{h}}, {{r1}}, {{r2}})',
  },
};
