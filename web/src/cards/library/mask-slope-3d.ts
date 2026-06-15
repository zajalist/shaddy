// Mask: slope (3D) — sets the layer mask from surface steepness (1 on steep
// faces, 0 on flat ground), using the normal's up-component. Follow with a
// Paint block to apply rock/cliff colour to steep areas.

import type { CardDef } from '../types';

export const MASK_SLOPE_3D: CardDef = {
  type: 'mask_slope_3d',
  category: 'color',
  friendlyName: 'Mask: slope (3D)',
  description: 'Layer mask from steepness — drives the next Paint block.',
  icon: '⛰',
  mode: '3d',
  params: {
    steep: { kind: 'float', label: 'steep at', default: 0.4, min: 0, max: 1, step: 0.01 },
    flat: { kind: 'float', label: 'flat at', default: 0.75, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: '// mask_slope_3d (3D) steep={{steep}} flat={{flat}}',
  contribution3d: {
    albedo: 'mask = 1.0 - smoothstep({{steep}}, {{flat}}, n.y);',
  },
};
