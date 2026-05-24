// Conic / sweep gradient — d goes 0..1 around the angle.

import type { CardDef } from '../types';

export const GRADIENT_CONIC: CardDef = {
  type: 'gradient_conic',
  category: 'shape',
  friendlyName: 'Conic gradient',
  description: 'Angle-based sweep gradient.',
  icon: '◔',
  params: {
    rotation: { kind: 'float', label: 'rotation', default: 0, min: -6.2832, max: 6.2832, step: 0.05 },
    cycles: { kind: 'float', label: 'cycles', default: 1, min: 1, max: 12, step: 1 },
  },
  snippetTemplate:
    'd = fract((atan(uv.y, uv.x) - {{rotation}}) / 6.2832 * {{cycles}} + 1.0);',
};
