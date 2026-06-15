// PBR GGX (3D) — physically based directional light: Cook-Torrance GGX specular
// + Lambert diffuse, driven by metallic / roughness. Replaces a plain Sun when
// you want metal/dielectric materials.

import type { CardDef } from '../types';

export const PBR_GGX_3D: CardDef = {
  type: 'pbr_ggx_3d',
  category: 'effect',
  friendlyName: 'PBR GGX (3D)',
  description: 'Metallic/roughness directional light (Cook-Torrance GGX).',
  icon: '🔩',
  mode: '3d',
  params: {
    lx: { kind: 'float', label: 'light x', default: 0.4, min: -1, max: 1, step: 0.05 },
    ly: { kind: 'float', label: 'light y', default: 0.8, min: 0, max: 1, step: 0.05 },
    lz: { kind: 'float', label: 'light z', default: -0.4, min: -1, max: 1, step: 0.05 },
    roughness: { kind: 'float', label: 'roughness', default: 0.35, min: 0.03, max: 1, step: 0.01 },
    metallic: { kind: 'float', label: 'metallic', default: 0.6, min: 0, max: 1, step: 0.01 },
    intensity: { kind: 'float', label: 'intensity', default: 1.4, min: 0, max: 5, step: 0.05 },
    color: { kind: 'color', label: 'light colour', default: [1.0, 0.96, 0.9] },
  },
  snippetTemplate:
    '// pbr_ggx_3d (3D) light=({{lx}},{{ly}},{{lz}}) rough={{roughness}} metal={{metallic}} intensity={{intensity}} color={{color}}',
  contribution3d: {
    light: `vec3 ld = normalize(vec3({{lx}}, {{ly}}, {{lz}}));
vec3 vv = -rd;
vec3 hh = normalize(ld + vv);
float ndl = max(dot(n, ld), 0.0);
float ndv = max(dot(n, vv), 1e-4);
float ndh = max(dot(n, hh), 0.0);
float a = max({{roughness}} * {{roughness}}, 1e-3);
float a2 = a * a;
float denom = ndh * ndh * (a2 - 1.0) + 1.0;
float distD = a2 / (3.14159265 * denom * denom);
float kk = a * 0.5;
float gg = (ndv / (ndv * (1.0 - kk) + kk)) * (ndl / (ndl * (1.0 - kk) + kk));
float f0 = mix(0.04, 1.0, {{metallic}});
float fr = f0 + (1.0 - f0) * pow(1.0 - max(dot(hh, vv), 0.0), 5.0);
float spec = distD * gg * fr / max(4.0 * ndv * ndl, 1e-3);
float sh = softShadow3(p + n * 0.02, ld, 0.03, 14.0, 0.1);
vec3 diff = alb * (1.0 - {{metallic}}) * 0.3183099;
vec3 specCol = mix(vec3(1.0), alb, {{metallic}});
lcol += (diff + specCol * spec) * ndl * sh * {{color}} * {{intensity}};`,
  },
};
