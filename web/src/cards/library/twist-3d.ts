// 3D twist — rotates the xz plane by an angle proportional to height (p.y),
// so subsequent shapes spiral as they rise. Classic iq domain distortion.

import type { CardDef } from '../types';

export const TWIST_3D: CardDef = {
  type: 'twist_3d',
  category: 'distortion',
  friendlyName: 'Twist',
  description: 'Spiral subsequent 3D shapes around the Y axis by height.',
  icon: '🌀',
  mode: '3d',
  params: {
    amount: { kind: 'float', label: 'amount', default: 1.2, min: -4, max: 4, step: 0.05 },
  },
  snippetTemplate: '// twist_3d (3D) amount={{amount}}',
  contribution3d: {
    // angle = amount * p.y; rotate (x,z) by it, leave y untouched.
    domainExpr:
      'vec3(cos({{amount}} * p.y) * p.x - sin({{amount}} * p.y) * p.z, p.y, sin({{amount}} * p.y) * p.x + cos({{amount}} * p.y) * p.z)',
  },
};
