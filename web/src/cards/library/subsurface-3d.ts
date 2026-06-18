// Subsurface (3D) — cheap translucency: light wrapping around the surface and
// glowing through thin parts (back-lit), approximated from a light direction.

import type { CardDef } from '../types';

export const SUBSURFACE_3D: CardDef = {
  type: 'subsurface_3d',
  category: 'effect',
  friendlyName: 'Subsurface',
  description: 'Translucent back-glow (wax / skin / jade look).',
  icon: '🫧',
  mode: '3d',
  params: {
    lx: { kind: 'float', label: 'light x', default: 0.4, min: -1, max: 1, step: 0.05 },
    ly: { kind: 'float', label: 'light y', default: 0.8, min: 0, max: 1, step: 0.05 },
    lz: { kind: 'float', label: 'light z', default: -0.4, min: -1, max: 1, step: 0.05 },
    power: { kind: 'float', label: 'falloff', default: 3, min: 0.5, max: 12, step: 0.1 },
    strength: { kind: 'float', label: 'strength', default: 0.7, min: 0, max: 3, step: 0.05 },
    color: { kind: 'color', label: 'glow tint', default: [1.0, 0.5, 0.35] },
  },
  snippetTemplate:
    '// subsurface_3d (3D) light=({{lx}},{{ly}},{{lz}}) power={{power}} strength={{strength}} color={{color}}',
  contribution3d: {
    light: `vec3 ld = normalize(vec3({{lx}}, {{ly}}, {{lz}}));
float back = pow(clamp(dot(rd, -ld), 0.0, 1.0), {{power}});
float wrap = clamp(dot(n, ld) * 0.5 + 0.5, 0.0, 1.0);
lcol += alb * {{color}} * (back + 0.3 * wrap) * {{strength}};`,
  },
};
