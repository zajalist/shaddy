// Vol: light scatter (3D) — a physically-flavoured volume integrator: marches
// the ray (from a Volume camera) through the density field (volField), with
// Beer-Lambert absorption AND single-scattering toward a sun direction. At each
// step it takes a few short shadow steps toward the sun to estimate how much
// light reaches that sample, so dense regions self-shadow and edges glow where
// the sun shines through (iq "Clouds" / Beer-powder lighting, generalized).
// Drop-in replacement for Volume march when you want LIT clouds/blobs. Writes
// `col`; follow with Exposure / Tonemap. Use in a 'volume' recipe.

import type { CardDef } from '../types';

export const VOL_LIGHT_SCATTER_3D: CardDef = {
  type: 'vol_light_scatter_3d',
  category: 'effect',
  friendlyName: 'Vol: light scatter',
  description: 'Lit volume march — Beer-Lambert absorption + in-scatter toward the sun.',
  icon: '🌥',
  params: {
    stepsize: { kind: 'float', label: 'step', default: 0.15, min: 0.05, max: 0.5, step: 0.005 },
    absorption: { kind: 'float', label: 'absorption', default: 1.2, min: 0.1, max: 5, step: 0.05 },
    sunx: { kind: 'float', label: 'sun x', default: 0.6, min: -1, max: 1, step: 0.05 },
    suny: { kind: 'float', label: 'sun y', default: 0.7, min: -1, max: 1, step: 0.05 },
    sunz: { kind: 'float', label: 'sun z', default: -0.4, min: -1, max: 1, step: 0.05 },
    suncol: { kind: 'color', label: 'sun colour', default: [1.0, 0.85, 0.6] },
    shadowcol: { kind: 'color', label: 'shadow colour', default: [0.35, 0.45, 0.6] },
  },
  snippetTemplate:
    '// vol_light_scatter step={{stepsize}} absorption={{absorption}} sun=({{sunx}},{{suny}},{{sunz}}) suncol={{suncol}} shadowcol={{shadowcol}}',
  contribution3d: {
    volMarch: `vec3 ldir = normalize(vec3({{sunx}}, {{suny}}, {{sunz}}));
float transmit = 1.0;
vec3 acc = vec3(0.0);
float s = 0.0;
for (int r = 0; r < 48; r++) {
  vec3 pos = vFrom + vDir * s;
  float dens = volField(pos) * {{stepsize}} * {{absorption}};
  if (dens > 0.001) {
    // short shadow march toward the sun → self-shadowing.
    float shadow = 0.0;
    for (int j = 1; j <= 4; j++) {
      shadow += volField(pos + ldir * float(j) * {{stepsize}});
    }
    float lit = exp(-shadow * {{stepsize}} * {{absorption}});
    vec3 sample_col = mix({{shadowcol}}, {{suncol}}, lit);
    acc += transmit * dens * sample_col;
    transmit *= 1.0 - dens;
    if (transmit < 0.01) break;
  }
  s += {{stepsize}};
}
col += acc;
col = mix(col, vec3(0.0), vec3(notEqual(col, col)));`,
  },
};
