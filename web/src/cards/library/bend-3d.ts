// 3D bend — cheaply bends the domain around the x-axis (iq opCheapBend), so
// subsequent shapes curve. k = bend amount (radians per unit).

import type { CardDef } from '../types';

export const BEND_3D: CardDef = {
  type: 'bend_3d',
  category: 'distortion',
  friendlyName: 'Bend',
  description: 'Bend following shapes around the x-axis.',
  icon: '🪝',
  mode: '3d',
  params: {
    k: { kind: 'float', label: 'amount', default: 0.6, min: -3, max: 3, step: 0.01 },
  },
  snippetTemplate: '// bend_3d (3D) k={{k}}',
  contribution3d: {
    domainExpr:
      'vec3(mat2(cos({{k}} * p.x), -sin({{k}} * p.x), sin({{k}} * p.x), cos({{k}} * p.x)) * p.xy, p.z)',
  },
};
