// Reflection (3D) — a real mirror: marches the reflected ray back into the
// scene so surfaces reflect OTHER geometry (not just the sky), fresnel-weighted.
// Place after the lighting blocks. One bounce (v1).

import type { CardDef } from '../types';

export const REFLECTION_3D: CardDef = {
  type: 'reflection_3d',
  category: 'effect',
  friendlyName: 'Reflection',
  description: 'Mirror reflection of the scene + sky, by grazing fresnel.',
  icon: '🪞',
  mode: '3d',
  params: {
    strength: { kind: 'float', label: 'strength', default: 0.8, min: 0, max: 1, step: 0.01 },
    base: { kind: 'float', label: 'base reflect', default: 0.04, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: '// reflection_3d (3D) strength={{strength}} base={{base}}',
  contribution3d: {
    light: `vec3 rr = reflect(rd, n);
vec3 rorg = p + n * 0.03;
float tr = 0.05;
vec3 rcol = g_sky(rr);
for (int ri = 0; ri < 48; ri++) {
  vec3 rp = rorg + rr * tr;
  float rdh = sdScene(rp);
  if (rdh < 0.001 * tr) {
    vec3 rn = sceneNormal3(rp, max(0.0015, tr * 0.0022));
    float rdif = max(dot(rn, normalize(vec3(0.3, 0.7, -0.5))), 0.0);
    rcol = g_material * (0.25 + 0.75 * rdif);
    break;
  }
  tr += clamp(rdh, 0.01, 0.6);
  if (tr > 20.0) break;
}
float fr = {{base}} + (1.0 - {{base}}) * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
lcol = mix(lcol, rcol, clamp(fr * {{strength}}, 0.0, 1.0));`,
  },
};
