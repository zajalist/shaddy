// 3D onion — turns the accumulated solid into a hollow shell of the given
// thickness (iq opOnion: abs(d) - t). Pair with Subtract to open it up.

import type { CardDef } from '../types';

export const ONION_3D: CardDef = {
  type: 'onion_3d',
  category: 'distortion',
  friendlyName: 'Onion Shell',
  description: 'Hollow the accumulated scene into a thin shell.',
  icon: '🧅',
  mode: '3d',
  params: {
    thickness: { kind: 'float', label: 'thickness', default: 0.05, min: 0.005, max: 0.5, step: 0.005 },
  },
  snippetTemplate: '// onion_3d (3D) thickness={{thickness}}',
  contribution3d: {
    sdfStmt: 'd = abs(d) - {{thickness}};',
  },
};
