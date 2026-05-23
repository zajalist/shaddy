import type { CardDef } from '../types';

// UV tiling. Place above a shape card to repeat it across the canvas.

export const REPEAT: CardDef = {
  type: 'repeat',
  category: 'distortion',
  friendlyName: 'Repeat',
  description: 'Tile UV space into a grid. Place above a shape card.',
  icon: '🔁',
  params: {
    count_x: { kind: 'float', label: 'count x', default: 3, min: 1, max: 12, step: 0.1 },
    count_y: { kind: 'float', label: 'count y', default: 3, min: 1, max: 12, step: 0.1 },
  },
  snippetTemplate:
    'uv = fract((uv * 0.5 + 0.5) * vec2({{count_x}}, {{count_y}})) * 2.0 - 1.0;',
};
