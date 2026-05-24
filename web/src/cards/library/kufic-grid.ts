// Square Kufic-inspired grid — orthogonal "stitching" pattern. Every cell
// is either a horizontal or vertical bar based on a hash, giving the
// characteristic 90°-only Kufic woven look.

import type { CardDef } from '../types';

export const KUFIC_GRID: CardDef = {
  type: 'kufic_grid',
  category: 'shape',
  friendlyName: 'Kufic grid',
  description: 'Square Kufic-inspired 90°-only stitching.',
  icon: '⊞',
  params: {
    scale: { kind: 'float', label: 'scale', default: 6, min: 2, max: 24, step: 0.1 },
    thickness: { kind: 'float', label: 'thickness', default: 0.18, min: 0.02, max: 0.5, step: 0.005 },
  },
  snippetTemplate: `{
    vec2 _p = uv * {{scale}};
    vec2 _ip = floor(_p);
    vec2 _fp = fract(_p) - 0.5;
    float _h = hash21(_ip);
    float _bar = (_h > 0.5) ? abs(_fp.y) : abs(_fp.x);
    d = 1.0 - smoothstep({{thickness}}, {{thickness}} + 0.02, _bar);
  }`,
  helpers: ['hash21'],
};
