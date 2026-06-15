// 3D pyramid — iq's square-pyramid SDF. Base sits on y=0, apex at y=height.

import type { CardDef } from '../types';

export const PYRAMID_3D: CardDef = {
  type: 'pyramid_3d',
  category: 'shape',
  friendlyName: 'Pyramid (3D)',
  description: 'Square pyramid contribution to the raymarched scene.',
  icon: '🔼',
  mode: '3d',
  helpers: ['sdfPyramid3'],
  params: {
    h: { kind: 'float', label: 'height', default: 1, min: 0.1, max: 4, step: 0.01 },
  },
  snippetTemplate: '// pyramid_3d (3D) h={{h}}',
  contribution3d: {
    sdfExpr: 'sdfPyramid3(p, {{h}})',
  },
};
