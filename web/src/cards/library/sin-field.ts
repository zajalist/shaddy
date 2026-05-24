// Pure cross-sine interference pattern — Lissajous-flavoured grid.

import type { CardDef } from '../types';

export const SIN_FIELD: CardDef = {
  type: 'sin_field',
  category: 'shape',
  friendlyName: 'Sin field',
  description: 'sin(x) * sin(y) interference pattern.',
  icon: '∿',
  params: {
    freq_x: { kind: 'float', label: 'freq x', default: 6, min: 0, max: 30, step: 0.1 },
    freq_y: { kind: 'float', label: 'freq y', default: 6, min: 0, max: 30, step: 0.1 },
  },
  snippetTemplate: 'd = 0.5 + 0.5 * sin(uv.x * {{freq_x}}) * sin(uv.y * {{freq_y}});',
};
