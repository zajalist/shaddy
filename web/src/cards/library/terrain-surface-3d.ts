// Terrain surface (3D) — an fbm height-field SDF (a landscape you can fly the
// camera over). Like the ocean surface but static fbm relief; pair with
// texturing (height tint) + Sun + Sky + Fog.

import type { CardDef } from '../types';

export const TERRAIN_SURFACE_3D: CardDef = {
  type: 'terrain_surface_3d',
  category: 'shape',
  friendlyName: 'Terrain surface (3D)',
  description: 'fbm height-field landscape — a raymarched terrain.',
  icon: '⛰',
  mode: '3d',
  helpers: ['terrainFbm'],
  params: {
    scale: { kind: 'float', label: 'scale', default: 0.4, min: 0.1, max: 2, step: 0.01 },
    height: { kind: 'float', label: 'height', default: 2.2, min: 0.2, max: 8, step: 0.1 },
  },
  snippetTemplate: '// terrain_surface_3d (3D) scale={{scale}} height={{height}}',
  contribution3d: {
    // Eroded ridged height-field. *0.5 keeps it a conservative march bound.
    sdfExpr: '(p.y - terrainFbm(p.xz * {{scale}}) * {{height}}) * 0.5',
  },
};
