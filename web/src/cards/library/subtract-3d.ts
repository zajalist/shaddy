// 3D subtract — switches CSG combine mode so subsequent shapes are SUBTRACTED
// from the accumulated scene (carves holes). Respects the current smoothness k.

import type { CardDef } from '../types';

export const SUBTRACT_3D: CardDef = {
  type: 'subtract_3d',
  category: 'distortion',
  friendlyName: 'Subtract',
  description: 'Carve following shapes out of the scene (CSG difference).',
  icon: '➖',
  mode: '3d',
  params: {},
  snippetTemplate: '// subtract_3d (3D) — following shapes carve the scene',
  contribution3d: {
    combine: '1',
  },
};
