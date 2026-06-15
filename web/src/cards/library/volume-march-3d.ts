// Volume march (3D) — steps the ray (from Volume camera) through the density
// field (volField), accumulating emissive colour with distance fading and a
// dark-matter cutoff (Star Nest's volumetric integration). Writes `col`; follow
// with Exposure / Vignette. Use in a 'volume' recipe with a camera + field block.

import type { CardDef } from '../types';

export const VOLUME_MARCH_3D: CardDef = {
  type: 'volume_march_3d',
  category: 'effect',
  friendlyName: 'Volume march',
  description: 'Accumulate colour by marching the ray through the density field.',
  icon: '🌫',
  params: {
    stepsize: { kind: 'float', label: 'step', default: 0.1, min: 0.02, max: 0.4, step: 0.005 },
    brightness: { kind: 'float', label: 'brightness', default: 0.0015, min: 0.0005, max: 0.006, step: 0.0001 },
    darkmatter: { kind: 'float', label: 'dark matter', default: 0.3, min: 0, max: 1, step: 0.01 },
    distfade: { kind: 'float', label: 'dist fade', default: 0.73, min: 0.5, max: 0.95, step: 0.01 },
    saturation: { kind: 'float', label: 'saturation', default: 0.85, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: '// volume_march step={{stepsize}} brightness={{brightness}} dark={{darkmatter}} fade={{distfade}} sat={{saturation}}',
  contribution3d: {
    volMarch: `float s = 0.1, fade = 1.0;
for (int r = 0; r < 20; r++) {
  vec3 p = vFrom + s * vDir * 0.5;
  float a = volField(p);
  float dm = max(0.0, {{darkmatter}} - a * a * 0.001);
  a *= a * a;
  if (r > 6) fade *= 1.0 - dm;
  col += fade;
  col += vec3(s, s * s, s * s * s * s) * a * {{brightness}} * fade;
  fade *= {{distfade}};
  s += {{stepsize}};
}
col = mix(vec3(length(col)), col, {{saturation}}) * 0.01;`,
  },
};
