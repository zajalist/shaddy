// Sun (3D) — a directional light: Lambert diffuse + soft shadow + a specular
// highlight, accumulated into the lit colour. A composable lighting block.

import type { CardDef } from '../types';

export const SUN_3D: CardDef = {
  type: 'sun_3d',
  category: 'effect',
  friendlyName: 'Sun (3D)',
  description: 'Directional light — diffuse + soft shadow + specular.',
  icon: '☀',
  mode: '3d',
  params: {
    dir_x: { kind: 'float', label: 'dir x', default: 0.3, min: -1, max: 1, step: 0.05 },
    dir_y: { kind: 'float', label: 'dir y', default: 0.7, min: 0, max: 1, step: 0.05 },
    dir_z: { kind: 'float', label: 'dir z', default: -0.5, min: -1, max: 1, step: 0.05 },
    color: { kind: 'color', label: 'colour', default: [1.0, 0.95, 0.85] },
    specular: { kind: 'float', label: 'specular', default: 1, min: 0, max: 4, step: 0.05 },
    shininess: { kind: 'float', label: 'shininess', default: 60, min: 1, max: 300, step: 1 },
    soft: { kind: 'float', label: 'shadow soft', default: 0.1, min: 0.01, max: 0.5, step: 0.01 },
  },
  snippetTemplate: '// sun_3d (3D) dir=({{dir_x}},{{dir_y}},{{dir_z}}) color={{color}} spec={{specular}} shin={{shininess}} soft={{soft}}',
  contribution3d: {
    light: `vec3 ld = normalize(vec3({{dir_x}}, {{dir_y}}, {{dir_z}}));
float dif = max(dot(n, ld), 0.0);
float sh = softShadow3(p + n * 0.02, ld, 0.03, 14.0, {{soft}});
lcol += alb * dif * sh * {{color}};
float sp = pow(max(dot(reflect(-ld, n), -rd), 0.0), {{shininess}});
lcol += sp * {{color}} * {{specular}} * sh;`,
  },
};
