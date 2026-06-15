// Checker material (3D) — procedural 3D checkerboard albedo. A texturing block:
// modifies the surface albedo `alb` (so lighting blocks pick it up).

import type { CardDef } from '../types';

export const CHECKER_MATERIAL_3D: CardDef = {
  type: 'checker_material_3d',
  category: 'color',
  friendlyName: 'Checker Material (3D)',
  description: 'Procedural 3D checkerboard surface colour.',
  icon: '🏁',
  mode: '3d',
  params: {
    scale: { kind: 'float', label: 'scale', default: 1.5, min: 0.1, max: 10, step: 0.1 },
    colorA: { kind: 'color', label: 'colour A', default: [0.92, 0.92, 0.92] },
    colorB: { kind: 'color', label: 'colour B', default: [0.12, 0.12, 0.14] },
  },
  snippetTemplate: '// checker_material_3d (3D) scale={{scale}} a={{colorA}} b={{colorB}}',
  contribution3d: {
    albedo: `float ch = mod(floor(p.x * {{scale}}) + floor(p.y * {{scale}}) + floor(p.z * {{scale}}), 2.0);
alb = mix({{colorA}}, {{colorB}}, ch);`,
  },
};
