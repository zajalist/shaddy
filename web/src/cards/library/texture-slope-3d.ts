// Texture: slope (3D) — paint steep faces a different colour from flat ground
// (rock on cliffs, grass/snow on flats), keyed on the surface normal's
// up-component. The classic terrain-texturing move from Shadertoy landscapes.
// Modifies the running albedo, so stack it after a base/height texture.

import type { CardDef } from '../types';

export const TEXTURE_SLOPE_3D: CardDef = {
  type: 'texture_slope_3d',
  category: 'color',
  friendlyName: 'Texture: slope (3D)',
  description: 'Tint steep slopes (rock) vs flat ground — by surface normal.',
  icon: '⛰',
  mode: '3d',
  params: {
    rock: { kind: 'color', label: 'slope colour', default: [0.32, 0.28, 0.24] },
    flat_lo: { kind: 'float', label: 'steep at', default: 0.45, min: 0, max: 1, step: 0.01 },
    flat_hi: { kind: 'float', label: 'flat at', default: 0.75, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: '// texture_slope_3d (3D) rock={{rock}} steep={{flat_lo}} flat={{flat_hi}}',
  contribution3d: {
    albedo: 'alb = mix({{rock}}, alb, smoothstep({{flat_lo}}, {{flat_hi}}, n.y));',
  },
};
