// Linear remap of d from [in_lo, in_hi] → [out_lo, out_hi], clamped.

import type { CardDef } from '../types';

export const REMAP: CardDef = {
  type: 'remap',
  category: 'distortion',
  friendlyName: 'Remap',
  description: 'Linear remap of d between two ranges (clamped).',
  icon: '↔',
  params: {
    in_lo: { kind: 'float', label: 'in lo', default: 0, min: -2, max: 2, step: 0.01 },
    in_hi: { kind: 'float', label: 'in hi', default: 1, min: -2, max: 2, step: 0.01 },
    out_lo: { kind: 'float', label: 'out lo', default: 0, min: -2, max: 2, step: 0.01 },
    out_hi: { kind: 'float', label: 'out hi', default: 1, min: -2, max: 2, step: 0.01 },
  },
  snippetTemplate: `{
    float _t = clamp((d - {{in_lo}}) / ({{in_hi}} - {{in_lo}} + 1e-6), 0.0, 1.0);
    d = mix({{out_lo}}, {{out_hi}}, _t);
  }`,
};
