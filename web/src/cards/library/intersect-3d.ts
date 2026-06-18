// 3D intersect — switches CSG combine mode so subsequent shapes INTERSECT the
// accumulated scene (keep only the overlap). Respects the current smoothness k.

import type { CardDef } from '../types';

export const INTERSECT_3D: CardDef = {
  type: 'intersect_3d',
  category: 'distortion',
  friendlyName: 'Intersect',
  description: 'Keep only where following shapes overlap the scene (CSG intersection).',
  icon: '⨯',
  mode: '3d',
  params: {},
  snippetTemplate: '// intersect_3d (3D) — following shapes intersect the scene',
  contribution3d: {
    combine: '2',
  },
};
