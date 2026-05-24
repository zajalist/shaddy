// iq's cosine palette — gorgeous parametric colour ramps.

import type { CardDef } from '../types';

export const COSINE_PALETTE: CardDef = {
  type: 'cosine_palette',
  category: 'color',
  friendlyName: 'Cosine palette',
  description: 'iq-style cosine palette — pretty parametric ramps.',
  icon: '🎨',
  params: {
    bias: { kind: 'color', label: 'bias', default: [0.5, 0.5, 0.5] },
    amp: { kind: 'color', label: 'amplitude', default: [0.5, 0.5, 0.5] },
    freq: { kind: 'color', label: 'frequency', default: [1, 1, 1] },
    phase: { kind: 'color', label: 'phase', default: [0, 0.33, 0.67] },
  },
  snippetTemplate: 'col = cospal(clamp(d, 0.0, 1.0), {{bias}}, {{amp}}, {{freq}}, {{phase}});',
  helpers: ['cospal'],
};
