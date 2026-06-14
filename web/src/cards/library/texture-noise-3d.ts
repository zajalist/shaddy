// Texture: noise (3D) — sets surface albedo by mixing two colours with fbm of
// the hit position (xz plane). Adds organic variation to a surface's colour.

import type { CardDef } from '../types';

export const TEXTURE_NOISE_3D: CardDef = {
  type: 'texture_noise_3d',
  category: 'color',
  friendlyName: 'Texture: noise (3D)',
  description: 'Albedo = two colours mixed by fbm of the surface position.',
  icon: '🎨',
  mode: '3d',
  helpers: ['fbm2'],
  params: {
    color_a: { kind: 'color', label: 'colour a', default: [0.02, 0.12, 0.22] },
    color_b: { kind: 'color', label: 'colour b', default: [0.1, 0.4, 0.5] },
    scale: { kind: 'float', label: 'scale', default: 1.5, min: 0.1, max: 8, step: 0.1 },
  },
  snippetTemplate: '// texture_noise_3d (3D) a={{color_a}} b={{color_b}} scale={{scale}}',
  contribution3d: {
    albedoExpr: 'mix({{color_a}}, {{color_b}}, fbm2(p.xz * {{scale}}))',
  },
};
