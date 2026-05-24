// Mirrored tiling on UV — uv = abs(mod(uv + period, 2*period) - period).
// Like Repeat but each tile reflects, so seams are continuous.

import type { CardDef } from '../types';

export const MIRROR_REPEAT: CardDef = {
  type: 'mirror_repeat',
  category: 'distortion',
  friendlyName: 'Mirror repeat',
  description: 'Mirrored UV tiling — seamless reflections.',
  icon: '🪞',
  params: {
    period: { kind: 'float', label: 'period', default: 0.6, min: 0.05, max: 4, step: 0.01 },
  },
  snippetTemplate:
    'uv = abs(mod(uv + {{period}}, 2.0 * {{period}}) - {{period}});',
};
