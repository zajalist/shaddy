// Single-pass bloom approx — different curve from `glow`. Soft halo.

import type { CardDef } from '../types';

export const BLOOM: CardDef = {
  type: 'bloom',
  category: 'effect',
  friendlyName: 'Bloom',
  description: 'Soft halo on bright areas (single-pass approx).',
  icon: '✨',
  params: {
    threshold: { kind: 'float', label: 'threshold', default: 0.5, min: 0, max: 1, step: 0.01 },
    intensity: { kind: 'float', label: 'intensity', default: 0.8, min: 0, max: 3, step: 0.05 },
  },
  snippetTemplate: `{
    float _lum = dot(col, vec3(0.299, 0.587, 0.114));
    float _b = pow(smoothstep({{threshold}}, 1.0, _lum), 1.5);
    col += col * _b * {{intensity}};
  }`,
};
