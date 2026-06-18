// Bump (3D) — perturb the surface normal with fbm so lighting picks up fine
// surface detail (rocky grain, ripples) without adding geometry. Place ABOVE
// the light blocks (Sun/Fresnel) so they shade the bumped normal.

import type { CardDef } from '../types';

export const BUMP_3D: CardDef = {
  type: 'bump_3d',
  category: 'effect',
  friendlyName: 'Bump',
  description: 'Perturb the normal with fbm detail — micro-relief for lighting.',
  icon: '🌑',
  mode: '3d',
  helpers: ['fbm2'],
  params: {
    scale: { kind: 'float', label: 'scale', default: 3, min: 0.2, max: 16, step: 0.1 },
    strength: { kind: 'float', label: 'strength', default: 0.3, min: 0, max: 2, step: 0.01 },
  },
  snippetTemplate: '// bump_3d (3D) scale={{scale}} strength={{strength}}',
  contribution3d: {
    light: `{
  float _be = 0.12 / {{scale}};
  float _b0 = fbm2(p.xz * {{scale}});
  float _bx = fbm2((p.xz + vec2(_be, 0.0)) * {{scale}});
  float _bz = fbm2((p.xz + vec2(0.0, _be)) * {{scale}});
  n = normalize(n + vec3(_b0 - _bx, 0.0, _b0 - _bz) * {{strength}} * 4.0);
}`,
  },
};
