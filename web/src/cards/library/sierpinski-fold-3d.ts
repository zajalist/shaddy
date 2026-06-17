// Sierpinski tetrahedron (3D) — KIFS fold fractal as a scene SDF.

import type { CardDef } from '../types';

export const SIERPINSKI_FOLD_3D: CardDef = {
  type: 'sierpinski_fold_3d',
  category: 'shape',
  friendlyName: 'Sierpinski (3D)',
  description: 'Folded Sierpinski tetrahedron fractal contribution to the scene.',
  icon: '🔺',
  mode: '3d',
  helpers: ['sdfSierpinski3'],
  params: {
    scale: { kind: 'float', label: 'scale', default: 2, min: 1.6, max: 2.6, step: 0.01 },
    size: { kind: 'float', label: 'size', default: 1.4, min: 0.3, max: 3, step: 0.01 },
  },
  snippetTemplate: '// sierpinski_fold_3d (3D) scale={{scale}} size={{size}}',
  contribution3d: {
    sdfExpr: 'sdfSierpinski3(p / {{size}}, {{scale}}) * {{size}}',
  },
};
