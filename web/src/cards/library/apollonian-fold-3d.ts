// Apollonian (3D) — iq's nested-sphere IFS fractal as a scene SDF.

import type { CardDef } from '../types';

export const APOLLONIAN_FOLD_3D: CardDef = {
  type: 'apollonian_fold_3d',
  category: 'shape',
  friendlyName: 'Apollonian',
  description: 'Nested-sphere IFS fractal contribution to the scene.',
  icon: '🫧',
  mode: '3d',
  helpers: ['sdfApollonian3'],
  params: {
    scale: { kind: 'float', label: 'scale', default: 1.25, min: 1, max: 1.6, step: 0.01 },
    size: { kind: 'float', label: 'size', default: 1.3, min: 0.3, max: 3, step: 0.01 },
  },
  snippetTemplate: '// apollonian_fold_3d (3D) scale={{scale}} size={{size}}',
  contribution3d: {
    sdfExpr: 'sdfApollonian3(p / {{size}}, {{scale}}) * {{size}}',
  },
};
