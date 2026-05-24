// 3D box — iq's standard box SDF, centred at origin.

import type { CardDef } from '../types';

export const BOX_3D: CardDef = {
  type: 'box_3d',
  category: 'shape',
  friendlyName: 'Box (3D)',
  description: 'Axis-aligned 3D box contribution to the raymarched scene.',
  icon: '📦',
  mode: '3d',
  helpers: ['sdfBox3'],
  params: {
    sx: { kind: 'float', label: 'size x', default: 0.5, min: 0.05, max: 3, step: 0.01 },
    sy: { kind: 'float', label: 'size y', default: 0.5, min: 0.05, max: 3, step: 0.01 },
    sz: { kind: 'float', label: 'size z', default: 0.5, min: 0.05, max: 3, step: 0.01 },
  },
  snippetTemplate: '// box_3d (3D) size=({{sx}},{{sy}},{{sz}})',
  contribution3d: {
    sdfExpr: 'sdfBox3(p, vec3({{sx}}, {{sy}}, {{sz}}))',
  },
};
