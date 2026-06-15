// 3D plane — infinite half-space at `dot(p, n) = h`. A general-direction plane
// (the horizontal Ground block is the n=(0,1,0) special case).

import type { CardDef } from '../types';

export const PLANE_3D: CardDef = {
  type: 'plane_3d',
  category: 'shape',
  friendlyName: 'Plane (3D)',
  description: 'Infinite plane (oriented half-space) contribution to the scene.',
  icon: '🟦',
  mode: '3d',
  params: {
    nx: { kind: 'float', label: 'normal x', default: 0, min: -1, max: 1, step: 0.01 },
    ny: { kind: 'float', label: 'normal y', default: 1, min: -1, max: 1, step: 0.01 },
    nz: { kind: 'float', label: 'normal z', default: 0, min: -1, max: 1, step: 0.01 },
    h:  { kind: 'float', label: 'offset',   default: 0, min: -3, max: 3, step: 0.01 },
  },
  // tiny y-bias inside normalize() so an all-zero normal never yields NaN.
  snippetTemplate: '// plane_3d (3D) n=({{nx}},{{ny}},{{nz}}) h={{h}}',
  contribution3d: {
    sdfExpr:
      'dot(p, normalize(vec3({{nx}}, {{ny}}, {{nz}}) + vec3(0.0, 1e-5, 0.0))) - {{h}}',
  },
};
