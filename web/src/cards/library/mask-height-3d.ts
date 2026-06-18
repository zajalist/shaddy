// Mask: height (3D) — sets the layer mask from the hit altitude (p.y), 0 below
// `low`, 1 above `high`. Follow with a Paint block to apply a colour through it
// (e.g. snow above the snow-line). UE5-style layer masking, block-based.

import type { CardDef } from '../types';

export const MASK_HEIGHT_3D: CardDef = {
  type: 'mask_height_3d',
  category: 'color',
  friendlyName: 'Mask: height',
  description: 'Layer mask from altitude — drives the next Paint block.',
  icon: '🗻',
  mode: '3d',
  params: {
    low: { kind: 'float', label: 'low', default: 1.5, min: -6, max: 8, step: 0.1 },
    high: { kind: 'float', label: 'high', default: 2.6, min: -6, max: 8, step: 0.1 },
  },
  snippetTemplate: '// mask_height_3d (3D) low={{low}} high={{high}}',
  contribution3d: {
    albedo: 'mask = smoothstep({{low}}, {{high}}, p.y);',
  },
};
