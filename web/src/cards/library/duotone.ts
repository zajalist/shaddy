// Like palette but with a sharp center pivot — high contrast 2-tone.

import type { CardDef } from '../types';

export const DUOTONE: CardDef = {
  type: 'duotone',
  category: 'color',
  friendlyName: 'Duotone',
  description: 'Two-tone with adjustable pivot — high-contrast.',
  icon: '◐',
  params: {
    color_low: { kind: 'color', label: 'low', default: [0.05, 0.05, 0.15] },
    color_high: { kind: 'color', label: 'high', default: [1, 0.55, 0.3] },
    pivot: { kind: 'float', label: 'pivot', default: 0.5, min: 0, max: 1, step: 0.01 },
    softness: { kind: 'float', label: 'softness', default: 0.05, min: 0, max: 0.5, step: 0.005 },
  },
  snippetTemplate:
    'col = mix({{color_low}}, {{color_high}}, smoothstep({{pivot}} - {{softness}}, {{pivot}} + {{softness}}, d));',
};
