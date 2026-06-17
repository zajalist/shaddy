// Orbit-trap colour (3D) — a texturing block that colours the surface from an
// iterated fold "orbit trap" of the hit point: it folds p a few times and
// records how close the orbit passed to the origin, then maps that to an iq
// cosine palette. Gives fractals (and any surface) rich banded, organic colour
// instead of a flat albedo. Sets `alb`; pairs with any lighting block.

import type { CardDef } from '../types';

export const ORBIT_TRAP_COLOR_3D: CardDef = {
  type: 'orbit_trap_color_3d',
  category: 'color',
  friendlyName: 'Orbit-trap colour (3D)',
  description: 'Folded orbit-trap surface colour via a cosine palette.',
  icon: '🌈',
  mode: '3d',
  helpers: ['cospal'],
  params: {
    scale: { kind: 'float', label: 'scale', default: 1.2, min: 0.3, max: 4, step: 0.05 },
    paletteA: { kind: 'color', label: 'base', default: [0.5, 0.5, 0.5] },
    paletteB: { kind: 'color', label: 'amp', default: [0.5, 0.5, 0.5] },
    paletteC: { kind: 'color', label: 'phase', default: [1.0, 0.8, 0.5] },
  },
  snippetTemplate:
    '// orbit_trap_color_3d (3D) scale={{scale}} a={{paletteA}} b={{paletteB}} c={{paletteC}}',
  contribution3d: {
    albedo: `vec3 _op = p * {{scale}};
float _trap = 1e9;
for (int _i = 0; _i < 6; _i++) {
  _op = abs(_op) / max(dot(_op, _op), 1e-4) - 0.7;
  _trap = min(_trap, length(_op));
}
alb = cospal(_trap, {{paletteA}}, {{paletteB}}, {{paletteC}}, vec3(0.0, 0.33, 0.67));`,
  },
};
