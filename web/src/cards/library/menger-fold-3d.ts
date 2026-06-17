// Menger sponge (3D) — iq's recursive box-subtraction fractal as a scene SDF.

import type { CardDef } from '../types';

export const MENGER_FOLD_3D: CardDef = {
  type: 'menger_fold_3d',
  category: 'shape',
  friendlyName: 'Menger Sponge (3D)',
  description: 'Recursive box-subtraction fractal contribution to the scene.',
  icon: '🧱',
  mode: '3d',
  helpers: ['sdfMenger3'],
  params: {
    size: { kind: 'float', label: 'size', default: 1.1, min: 0.3, max: 3, step: 0.01 },
  },
  snippetTemplate: '// menger_fold_3d (3D) size={{size}}',
  contribution3d: {
    sdfExpr: 'sdfMenger3(p / {{size}}) * {{size}}',
  },
};
