// Quantise to ascii-like brightness levels by gating on luminance into N steps.

import type { CardDef } from '../types';

export const ASCII: CardDef = {
  type: 'ascii',
  category: 'effect',
  friendlyName: 'ASCII',
  description: 'Quantise luminance into discrete steps — ascii-art-ish.',
  icon: '#',
  params: {
    cell_size: { kind: 'float', label: 'cell size', default: 12, min: 4, max: 60, step: 1 },
    levels: { kind: 'float', label: 'levels', default: 6, min: 2, max: 12, step: 1 },
  },
  snippetTemplate: `{
    vec2 _c = floor(gl_FragCoord.xy / {{cell_size}}) * {{cell_size}};
    float _lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = vec3(floor(_lum * {{levels}}) / ({{levels}} - 1.0));
  }`,
};
