// Reinhard tonemap — col / (1 + col). The simplest, cheapest HDR → LDR
// compressor; rolls off highlights smoothly without a shoulder.

import type { CardDef } from '../types';

export const REINHARD_TONEMAP: CardDef = {
  type: 'reinhard_tonemap',
  category: 'effect',
  friendlyName: 'Reinhard tonemap',
  description: 'Classic Reinhard tonemap: col / (1 + col).',
  icon: '📸',
  params: {
    exposure: { kind: 'float', label: 'exposure', default: 1, min: 0, max: 4, step: 0.01 },
  },
  snippetTemplate: `{
    vec3 _x = col * {{exposure}};
    col = _x / (1.0 + _x);
  }`,
};
