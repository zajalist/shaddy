// 3D torus — ring lying in the xz plane.

import type { CardDef } from '../types';

export const TORUS_3D: CardDef = {
  type: 'torus_3d',
  category: 'shape',
  friendlyName: 'Torus (3D)',
  description: 'Ring torus contribution to the raymarched scene.',
  icon: '🍩',
  mode: '3d',
  helpers: ['sdfTorus3'],
  params: {
    r_major: { kind: 'float', label: 'major r', default: 0.7, min: 0.05, max: 3,   step: 0.01 },
    r_minor: { kind: 'float', label: 'minor r', default: 0.2, min: 0.01, max: 1.5, step: 0.01 },
  },
  snippetTemplate: '// torus_3d (3D) R={{r_major}} r={{r_minor}}',
  contribution3d: {
    sdfExpr: 'sdfTorus3(p, vec2({{r_major}}, {{r_minor}}))',
  },
};
