// 3D ellipsoid — iq's bound approximation (a sphere with per-axis radii).

import type { CardDef } from '../types';

export const ELLIPSOID_3D: CardDef = {
  type: 'ellipsoid_3d',
  category: 'shape',
  friendlyName: 'Ellipsoid',
  description: 'Ellipsoid (per-axis radii) contribution to the raymarched scene.',
  icon: '🥚',
  mode: '3d',
  helpers: ['sdfEllipsoid3'],
  params: {
    rx: { kind: 'float', label: 'radius x', default: 0.6, min: 0.05, max: 3, step: 0.01 },
    ry: { kind: 'float', label: 'radius y', default: 0.4, min: 0.05, max: 3, step: 0.01 },
    rz: { kind: 'float', label: 'radius z', default: 0.5, min: 0.05, max: 3, step: 0.01 },
  },
  snippetTemplate: '// ellipsoid_3d (3D) r=({{rx}},{{ry}},{{rz}})',
  contribution3d: {
    sdfExpr: 'sdfEllipsoid3(p, vec3({{rx}}, {{ry}}, {{rz}}))',
  },
};
