// Onion operator on `d` — abs(d) - thickness. Reveals concentric isocontour
// shells of any SDF underneath; chain it after a shape card to get a ring
// or wireframe-like inset.

import type { CardDef } from '../types';

export const ONION: CardDef = {
  type: 'onion',
  category: 'distortion',
  friendlyName: 'Onion',
  description: 'abs(d) - thickness — reveals isocontour shells.',
  icon: '🧅',
  params: {
    thickness: { kind: 'float', label: 'thickness', default: 0.05, min: 0, max: 0.5, step: 0.005 },
  },
  snippetTemplate: 'd = abs(d) - {{thickness}};',
};
