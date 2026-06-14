// Ocean surface (3D) — a height-field SDF using the Seascape wave function, so
// the raymarcher renders a real animated sea. Combine with Camera + Sky + Sun +
// Fresnel + Fog blocks to build a full ocean from blocks. The `* 0.6` keeps the
// height-field a conservative distance bound so sphere-tracing doesn't overshoot.

import type { CardDef } from '../types';

export const SEA_SURFACE_3D: CardDef = {
  type: 'sea_surface_3d',
  category: 'shape',
  friendlyName: 'Ocean surface (3D)',
  description: 'Animated Seascape wave height-field — a raymarched sea.',
  icon: '🌊',
  mode: '3d',
  helpers: ['seaHeight'],
  params: {
    scale: { kind: 'float', label: 'scale', default: 1, min: 0.3, max: 4, step: 0.05 },
    height: { kind: 'float', label: 'height', default: 0.6, min: 0.1, max: 2, step: 0.05 },
    speed: { kind: 'float', label: 'speed', default: 0.6, min: 0, max: 3, step: 0.01 },
  },
  snippetTemplate: '// sea_surface_3d (3D) scale={{scale}} height={{height}} speed={{speed}}',
  contribution3d: {
    sdfExpr: '(p.y - seaHeight(p.xz * {{scale}}, u_time * {{speed}}) * {{height}}) * 0.6',
  },
};
