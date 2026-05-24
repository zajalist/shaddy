// 3D smooth-union — sets the smoothness `k` parameter the compiler uses for
// all subsequent CSG unions. k = 0 falls back to a hard min().

import type { CardDef } from '../types';

export const SMOOTH_UNION_3D: CardDef = {
  type: 'smooth_union_3d',
  category: 'distortion',
  friendlyName: 'Smooth Union (3D)',
  description: 'Smoothly blend the next 3D shapes together (iq smooth-min).',
  icon: '🫧',
  mode: '3d',
  params: {
    k: { kind: 'float', label: 'smoothness', default: 0.2, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: '// smooth_union_3d (3D) k={{k}}',
  contribution3d: {
    smoothness: '{{k}}',
  },
};
