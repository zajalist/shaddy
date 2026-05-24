// 3D material colour — sets the global surface colour the lighting pass uses.
// v1 caveat: material is global (LAST material card wins), not per-surface.

import type { CardDef } from '../types';

export const MATERIAL_COLOR_3D: CardDef = {
  type: 'material_color_3d',
  category: 'color',
  friendlyName: 'Material Color (3D)',
  description: 'Set the surface colour used by the 3D lighting pass.',
  icon: '🎨',
  mode: '3d',
  params: {
    color: { kind: 'color', label: 'color', default: [0.85, 0.7, 0.45] },
  },
  snippetTemplate: '// material_color_3d (3D) color={{color}}',
  contribution3d: {
    material: '{{color}}',
  },
};
