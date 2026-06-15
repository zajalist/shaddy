// Refraction (3D) — glass: bends the ray through the surface (IOR) to sample
// the sky behind, and adds a fresnel sky reflection on top. `opacity` blends
// back toward the lit colour for frosted/solid glass.

import type { CardDef } from '../types';

export const REFRACTION_3D: CardDef = {
  type: 'refraction_3d',
  category: 'effect',
  friendlyName: 'Refraction (3D)',
  description: 'Glass — refract the sky through the surface + fresnel sheen.',
  icon: '🔮',
  mode: '3d',
  params: {
    ior: { kind: 'float', label: 'index (IOR)', default: 1.45, min: 1, max: 2.5, step: 0.01 },
    opacity: { kind: 'float', label: 'opacity', default: 0.15, min: 0, max: 1, step: 0.01 },
    tint: { kind: 'color', label: 'tint', default: [0.85, 0.95, 1.0] },
  },
  snippetTemplate: '// refraction_3d (3D) ior={{ior}} opacity={{opacity}} tint={{tint}}',
  contribution3d: {
    light: `vec3 rr = refract(rd, n, 1.0 / max({{ior}}, 1.0));
vec3 rfl = reflect(rd, n);
float fr = 0.04 + 0.96 * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
vec3 g = mix(g_sky(rr) * {{tint}}, g_sky(rfl), fr);
lcol = mix(g, lcol, clamp({{opacity}}, 0.0, 1.0));`,
  },
};
