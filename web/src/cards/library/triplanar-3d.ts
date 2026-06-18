// Triplanar (3D) — projects procedural fbm detail onto the surface from all
// three axes, weighted by the normal, so it never stretches on steep faces.
// Sets the layer `mask` → follow with a Paint block to colour the detail.

import type { CardDef } from '../types';

export const TRIPLANAR_3D: CardDef = {
  type: 'triplanar_3d',
  category: 'color',
  friendlyName: 'Triplanar',
  description: 'Stretch-free fbm detail mask projected across 3 axes.',
  icon: '🧊',
  mode: '3d',
  helpers: ['fbm2'],
  params: {
    scale: { kind: 'float', label: 'scale', default: 2.5, min: 0.2, max: 16, step: 0.1 },
    contrast: { kind: 'float', label: 'contrast', default: 1.4, min: 0.1, max: 4, step: 0.05 },
  },
  snippetTemplate: '// triplanar_3d (3D) scale={{scale}} contrast={{contrast}}',
  contribution3d: {
    albedo: `vec3 _tw = abs(n);
_tw /= max(_tw.x + _tw.y + _tw.z, 1e-4);
float _tp = fbm2(p.yz * {{scale}}) * _tw.x + fbm2(p.zx * {{scale}}) * _tw.y + fbm2(p.xy * {{scale}}) * _tw.z;
mask = clamp((_tp - 0.5) * {{contrast}} + 0.5, 0.0, 1.0);`,
  },
};
