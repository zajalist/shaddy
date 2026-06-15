// 3D triangular prism — iq's tri-prism SDF, axis on z.

import type { CardDef } from '../types';

export const TRI_PRISM_3D: CardDef = {
  type: 'tri_prism_3d',
  category: 'shape',
  friendlyName: 'Tri Prism (3D)',
  description: 'Triangular prism contribution to the raymarched scene.',
  icon: '🔻',
  mode: '3d',
  helpers: ['sdfTriPrism3'],
  params: {
    size:  { kind: 'float', label: 'size',       default: 0.8, min: 0.05, max: 3, step: 0.01 },
    depth: { kind: 'float', label: 'half-depth', default: 0.4, min: 0.05, max: 3, step: 0.01 },
  },
  snippetTemplate: '// tri_prism_3d (3D) size={{size}} depth={{depth}}',
  contribution3d: {
    sdfExpr: 'sdfTriPrism3(p, vec2({{size}}, {{depth}}))',
  },
};
