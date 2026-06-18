// Mask: fresnel (3D) — sets the layer mask from the grazing angle (high at
// edges/silhouette). Paint a rim colour or a wet sheen through it.

import type { CardDef } from '../types';

export const MASK_FRESNEL_3D: CardDef = {
  type: 'mask_fresnel_3d',
  category: 'color',
  friendlyName: 'Mask: fresnel',
  description: 'Layer mask from grazing angle (edges) — drives the next Paint.',
  icon: '💧',
  mode: '3d',
  params: {
    power: { kind: 'float', label: 'power', default: 4, min: 0.5, max: 12, step: 0.1 },
  },
  snippetTemplate: '// mask_fresnel_3d (3D) power={{power}}',
  contribution3d: {
    albedo: 'mask = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), {{power}});',
  },
};
