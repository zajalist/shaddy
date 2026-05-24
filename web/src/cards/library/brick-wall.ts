// Brick pattern — offset rectangular grid with mortar lines.

import type { CardDef } from '../types';

export const BRICK_WALL: CardDef = {
  type: 'brick_wall',
  category: 'shape',
  friendlyName: 'Brick wall',
  description: 'Brick / stretcher-bond pattern.',
  icon: '🧱',
  params: {
    scale: { kind: 'float', label: 'scale', default: 6, min: 1, max: 20, step: 0.1 },
    mortar: { kind: 'float', label: 'mortar', default: 0.05, min: 0.005, max: 0.3, step: 0.005 },
    aspect: { kind: 'float', label: 'aspect', default: 2, min: 1, max: 4, step: 0.1 },
  },
  snippetTemplate: `{
    vec2 _p = uv * {{scale}};
    float _row = floor(_p.y);
    _p.x += mod(_row, 2.0) * 0.5 * {{aspect}};
    _p = vec2(_p.x / {{aspect}}, _p.y);
    vec2 _f = abs(fract(_p) - 0.5);
    d = 1.0 - step(0.5 - {{mortar}}, max(_f.x, _f.y));
  }`,
};
