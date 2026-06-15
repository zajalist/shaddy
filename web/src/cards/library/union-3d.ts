// 3D union — resets CSG combine mode back to union (the default). Use after a
// Subtract / Intersect block to go back to adding shapes normally.

import type { CardDef } from '../types';

export const UNION_3D: CardDef = {
  type: 'union_3d',
  category: 'distortion',
  friendlyName: 'Union (3D)',
  description: 'Add following shapes to the scene again (resets Subtract/Intersect).',
  icon: '➕',
  mode: '3d',
  params: {},
  snippetTemplate: '// union_3d (3D) — following shapes add to the scene',
  contribution3d: {
    combine: '0',
  },
};
