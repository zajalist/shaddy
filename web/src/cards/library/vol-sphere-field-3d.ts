// Vol: sphere field (3D) — the density function for a volumetric march: a
// lattice of soft density spheres (smooth radial falloff), tiled through space
// so the march sees an endless field of glowing blobs / metaballs. Emitted as
// volField(p); a Volume march / Vol: light scatter block samples it each step.
// Use in a 'volume' recipe with a Volume camera. Generalizable blob/metaball
// volume — pair with any field for puffy cores.

import type { CardDef } from '../types';

export const VOL_SPHERE_FIELD_3D: CardDef = {
  type: 'vol_sphere_field_3d',
  category: 'shape',
  friendlyName: 'Vol: sphere field',
  description: 'Tiled soft-sphere density field (blobs/metaballs) for volume marching.',
  icon: '⬤',
  params: {
    tile: { kind: 'float', label: 'tile', default: 1.6, min: 0.5, max: 4, step: 0.01 },
    radius: { kind: 'float', label: 'radius', default: 0.55, min: 0.1, max: 1.0, step: 0.01 },
    falloff: { kind: 'float', label: 'falloff', default: 2.0, min: 0.5, max: 6, step: 0.05 },
    density: { kind: 'float', label: 'density', default: 1.0, min: 0, max: 4, step: 0.05 },
  },
  snippetTemplate:
    '// vol_sphere_field tile={{tile}} radius={{radius}} falloff={{falloff}} density={{density}}',
  contribution3d: {
    volField: `vec3 cell = mod(p, vec3({{tile}})) - {{tile}} * 0.5;
float dist = length(cell) / max({{radius}}, 1e-3);
a += pow(max(0.0, 1.0 - dist), {{falloff}}) * {{density}};`,
  },
};
