// d → grayscale.

import type { CardDef } from '../types';

export const D_AS_RGB: CardDef = {
  type: 'd_as_rgb',
  category: 'color',
  friendlyName: 'd → grayscale',
  description: 'Map d straight into greyscale.',
  icon: '◻',
  params: {
    contrast: { kind: 'float', label: 'contrast', default: 1, min: 0, max: 3, step: 0.05 },
  },
  snippetTemplate: 'col = vec3(clamp((d - 0.5) * {{contrast}} + 0.5, 0.0, 1.0));',
};
