// Grid material (3D) — a texturing block that draws thin antialiased grid lines
// onto the surface albedo (triplanar, so it never stretches on steep faces).
// Generalizable floor/wall/tech-panel detail — pairs with any lighting block.

import type { CardDef } from '../types';

export const GRID_MATERIAL_3D: CardDef = {
  type: 'grid_material_3d',
  category: 'color',
  friendlyName: 'Grid material (3D)',
  description: 'Antialiased triplanar grid lines painted onto the surface colour.',
  icon: '🔳',
  mode: '3d',
  params: {
    scale: { kind: 'float', label: 'scale', default: 2.0, min: 0.1, max: 12, step: 0.1 },
    thickness: { kind: 'float', label: 'thickness', default: 0.04, min: 0.005, max: 0.3, step: 0.005 },
    lineColor: { kind: 'color', label: 'line colour', default: [0.05, 0.06, 0.08] },
  },
  snippetTemplate: '// grid_material_3d (3D) scale={{scale}} thickness={{thickness}} line={{lineColor}}',
  contribution3d: {
    albedo: `vec3 _gw = abs(n);
_gw /= max(_gw.x + _gw.y + _gw.z, 1e-4);
vec2 _ga = abs(fract(p.yz * {{scale}}) - 0.5);
vec2 _gb = abs(fract(p.zx * {{scale}}) - 0.5);
vec2 _gc = abs(fract(p.xy * {{scale}}) - 0.5);
float _gl = 0.0;
_gl += (1.0 - smoothstep(0.0, {{thickness}}, min(_ga.x, _ga.y))) * _gw.x;
_gl += (1.0 - smoothstep(0.0, {{thickness}}, min(_gb.x, _gb.y))) * _gw.y;
_gl += (1.0 - smoothstep(0.0, {{thickness}}, min(_gc.x, _gc.y))) * _gw.z;
alb = mix(alb, {{lineColor}}, clamp(_gl, 0.0, 1.0));`,
  },
};
