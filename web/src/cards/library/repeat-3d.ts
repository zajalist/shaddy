// 3D domain repetition — wraps the xz plane by `spacing_xz` so subsequent
// cards repeat infinitely across the ground plane.

import type { CardDef } from '../types';

export const REPEAT_3D: CardDef = {
  type: 'repeat_3d',
  category: 'distortion',
  friendlyName: 'Repeat (3D)',
  description: 'Tile the xz plane so subsequent 3D shapes repeat infinitely.',
  icon: '🔁',
  mode: '3d',
  params: {
    spacing_xz: { kind: 'float', label: 'spacing xz', default: 2, min: 0.2, max: 8, step: 0.05 },
  },
  snippetTemplate: '// repeat_3d (3D) spacing={{spacing_xz}}',
  contribution3d: {
    // Classic iq mod-based domain repetition restricted to the xz plane —
    // leaves y untouched so a ground card below still reads as a single
    // continuous floor.
    domainExpr:
      'vec3(mod(p.x + 0.5 * ({{spacing_xz}}), ({{spacing_xz}})) - 0.5 * ({{spacing_xz}}), p.y, mod(p.z + 0.5 * ({{spacing_xz}}), ({{spacing_xz}})) - 0.5 * ({{spacing_xz}}))',
  },
};
