// pow(d, gamma) — bend the d-curve to gather or spread values.

import type { CardDef } from '../types';

export const POWER_CURVE: CardDef = {
  type: 'power_curve',
  category: 'distortion',
  friendlyName: 'Power curve',
  description: 'pow(d, gamma) — bend the d-curve.',
  icon: '∫',
  params: {
    gamma: { kind: 'float', label: 'gamma', default: 1.5, min: 0.1, max: 6, step: 0.05 },
  },
  snippetTemplate: 'd = pow(clamp(d, 0.0, 1.0), {{gamma}});',
};
