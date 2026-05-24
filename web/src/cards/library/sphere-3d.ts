// 3D sphere — contributes `length(p - centre) - r` to the scene SDF.
// Used by the raymarched 3D compiler path (Recipe.mode === '3d').

import type { CardDef } from '../types';

export const SPHERE_3D: CardDef = {
  type: 'sphere_3d',
  category: 'shape',
  friendlyName: 'Sphere (3D)',
  description: 'Solid sphere contribution to the raymarched scene.',
  icon: '🟣',
  mode: '3d',
  params: {
    r:  { kind: 'float', label: 'radius',   default: 0.6, min: 0.05, max: 3,  step: 0.01 },
    cx: { kind: 'float', label: 'centre x', default: 0,   min: -3,   max: 3,  step: 0.01 },
    cy: { kind: 'float', label: 'centre y', default: 0.6, min: -3,   max: 3,  step: 0.01 },
    cz: { kind: 'float', label: 'centre z', default: 0,   min: -3,   max: 3,  step: 0.01 },
  },
  // snippetTemplate is unused by the 3D compiler path but must reference
  // every param (library.test.ts invariant) and stay non-empty.
  snippetTemplate:
    '// sphere_3d (3D — see contribution3d) r={{r}} c=({{cx}},{{cy}},{{cz}})',
  contribution3d: {
    sdfExpr: 'length(p - vec3({{cx}}, {{cy}}, {{cz}})) - {{r}}',
  },
};
