// 3D hexagonal prism — iq's hex-prism SDF, axis on z.

import type { CardDef } from '../types';

export const HEX_PRISM_3D: CardDef = {
  type: 'hex_prism_3d',
  category: 'shape',
  friendlyName: 'Hex Prism',
  description: 'Hexagonal prism contribution to the raymarched scene.',
  icon: '⬡',
  mode: '3d',
  helpers: ['sdfHexPrism3'],
  params: {
    r:     { kind: 'float', label: 'radius',     default: 0.5, min: 0.05, max: 3, step: 0.01 },
    depth: { kind: 'float', label: 'half-depth', default: 0.4, min: 0.05, max: 3, step: 0.01 },
  },
  snippetTemplate: '// hex_prism_3d (3D) r={{r}} depth={{depth}}',
  contribution3d: {
    sdfExpr: 'sdfHexPrism3(p, vec2({{r}}, {{depth}}))',
  },
};
