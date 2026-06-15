// 3D displace — adds a sinusoidal lattice ripple to the accumulated surface
// (iq opDisplace). Keep amp small so the field stays march-safe.

import type { CardDef } from '../types';

export const DISPLACE_3D: CardDef = {
  type: 'displace_3d',
  category: 'distortion',
  friendlyName: 'Displace (3D)',
  description: 'Ripple the accumulated surface with a sine lattice.',
  icon: '〰️',
  mode: '3d',
  params: {
    amp:  { kind: 'float', label: 'amount',    default: 0.08, min: 0,   max: 0.4, step: 0.005 },
    freq: { kind: 'float', label: 'frequency', default: 4,    min: 0.5, max: 16,  step: 0.1 },
  },
  snippetTemplate: '// displace_3d (3D) amp={{amp}} freq={{freq}}',
  contribution3d: {
    sdfStmt: 'd += {{amp}} * sin({{freq}} * p.x) * sin({{freq}} * p.y) * sin({{freq}} * p.z);',
  },
};
