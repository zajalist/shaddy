// Point light (3D) — a positioned light with inverse-square falloff, Lambert
// diffuse and a soft shadow. Composable lighting block.

import type { CardDef } from '../types';

export const POINT_LIGHT_3D: CardDef = {
  type: 'point_light_3d',
  category: 'effect',
  friendlyName: 'Point Light',
  description: 'Positioned light — diffuse + distance falloff + soft shadow.',
  icon: '💡',
  mode: '3d',
  params: {
    px: { kind: 'float', label: 'pos x', default: 2, min: -8, max: 8, step: 0.1 },
    py: { kind: 'float', label: 'pos y', default: 3, min: -8, max: 8, step: 0.1 },
    pz: { kind: 'float', label: 'pos z', default: 2, min: -8, max: 8, step: 0.1 },
    intensity: { kind: 'float', label: 'intensity', default: 6, min: 0, max: 30, step: 0.5 },
    falloff: { kind: 'float', label: 'falloff', default: 0.6, min: 0, max: 4, step: 0.05 },
    color: { kind: 'color', label: 'colour', default: [1.0, 0.9, 0.8] },
  },
  snippetTemplate:
    '// point_light_3d (3D) pos=({{px}},{{py}},{{pz}}) intensity={{intensity}} falloff={{falloff}} color={{color}}',
  contribution3d: {
    light: `vec3 L = vec3({{px}}, {{py}}, {{pz}}) - p;
float dist = length(L);
L /= max(dist, 1e-4);
float dif = max(dot(n, L), 0.0);
float att = {{intensity}} / (1.0 + {{falloff}} * dist * dist);
float sh = softShadow3(p + n * 0.02, L, 0.03, dist, 0.12);
lcol += alb * dif * att * sh * {{color}};`,
  },
};
