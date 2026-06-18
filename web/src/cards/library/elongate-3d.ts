// 3D elongate — stretches subsequent shapes along each axis by carving a slab
// of "no-distance" through the domain (iq opElongate). h = half-lengths.

import type { CardDef } from '../types';

export const ELONGATE_3D: CardDef = {
  type: 'elongate_3d',
  category: 'distortion',
  friendlyName: 'Elongate',
  description: 'Stretch following shapes along the axes.',
  icon: '↔️',
  mode: '3d',
  params: {
    hx: { kind: 'float', label: 'stretch x', default: 0.3, min: 0, max: 2, step: 0.01 },
    hy: { kind: 'float', label: 'stretch y', default: 0,   min: 0, max: 2, step: 0.01 },
    hz: { kind: 'float', label: 'stretch z', default: 0,   min: 0, max: 2, step: 0.01 },
  },
  snippetTemplate: '// elongate_3d (3D) h=({{hx}},{{hy}},{{hz}})',
  contribution3d: {
    domainExpr:
      'p - clamp(p, -vec3({{hx}}, {{hy}}, {{hz}}), vec3({{hx}}, {{hy}}, {{hz}}))',
  },
};
