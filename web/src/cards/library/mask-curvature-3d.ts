// Mask: curvature (3D) — sets the layer mask from surface curvature via the
// SDF Laplacian: high on convex edges/ridges, low in concave creases. Follow
// with a Paint block to wear edges (edge highlights) or dirt creases.

import type { CardDef } from '../types';

export const MASK_CURVATURE_3D: CardDef = {
  type: 'mask_curvature_3d',
  category: 'color',
  friendlyName: 'Mask: curvature',
  description: 'Layer mask from edges vs creases — drives the next Paint block.',
  icon: '🪨',
  mode: '3d',
  params: {
    radius: { kind: 'float', label: 'radius', default: 0.04, min: 0.005, max: 0.2, step: 0.005 },
    gain: { kind: 'float', label: 'gain', default: 0.5, min: 0, max: 4, step: 0.05 },
  },
  snippetTemplate: '// mask_curvature_3d (3D) radius={{radius}} gain={{gain}}',
  contribution3d: {
    albedo: `float _ce = {{radius}};
float _curv = (6.0 * sdScene(p)
  - sdScene(p + vec3(_ce, 0.0, 0.0)) - sdScene(p - vec3(_ce, 0.0, 0.0))
  - sdScene(p + vec3(0.0, _ce, 0.0)) - sdScene(p - vec3(0.0, _ce, 0.0))
  - sdScene(p + vec3(0.0, 0.0, _ce)) - sdScene(p - vec3(0.0, 0.0, _ce))) / (_ce * _ce);
mask = clamp(0.5 + _curv * {{gain}}, 0.0, 1.0);`,
  },
};
