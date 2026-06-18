// Paint (3D) — blend a colour into the surface albedo THROUGH the current mask
// (set by a Mask block above it). The core of the block-based layer-texturing
// system: stack Mask → Paint → Mask → Paint to build up a material like UE5's
// layer blends, but readable. With no Mask above, mask = 1 (paints everywhere).

import type { CardDef } from '../types';

export const PAINT_3D: CardDef = {
  type: 'paint_3d',
  category: 'color',
  friendlyName: 'Paint',
  description: 'Blend a colour into the surface through the current mask.',
  icon: '🖌',
  mode: '3d',
  params: {
    color: { kind: 'color', label: 'colour', default: [0.5, 0.5, 0.52] },
    strength: { kind: 'float', label: 'strength', default: 1, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: '// paint_3d (3D) colour={{color}} strength={{strength}}',
  contribution3d: {
    albedo: 'alb = mix(alb, {{color}}, clamp(mask * {{strength}}, 0.0, 1.0));',
  },
};
