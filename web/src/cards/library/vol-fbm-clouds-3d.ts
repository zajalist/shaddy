// Vol: fbm clouds (3D) — the density function for a volumetric march: 5-octave
// 3D fBm shaped by a coverage threshold so wisps thin out toward the edges
// (iq "Clouds" XslGRr technique). Emitted as volField(p); a Volume march /
// Vol: light scatter block samples it each step. Use in a 'volume' recipe with
// a Volume camera. Drift animates the field by scrolling it through time.

import type { CardDef } from '../types';

export const VOL_FBM_CLOUDS_3D: CardDef = {
  type: 'vol_fbm_clouds_3d',
  category: 'shape',
  friendlyName: 'Vol: fbm clouds',
  description: '3D fBm cloud density (coverage-shaped) for volume marching.',
  icon: '☁',
  helpers: ['fbm3'],
  params: {
    scale: { kind: 'float', label: 'scale', default: 0.6, min: 0.1, max: 2.5, step: 0.01 },
    coverage: { kind: 'float', label: 'coverage', default: 0.5, min: 0, max: 1, step: 0.01 },
    drift: { kind: 'float', label: 'drift', default: 0.15, min: 0, max: 1, step: 0.01 },
    density: { kind: 'float', label: 'density', default: 1.0, min: 0, max: 4, step: 0.05 },
  },
  snippetTemplate:
    '// vol_fbm_clouds scale={{scale}} coverage={{coverage}} drift={{drift}} density={{density}}',
  contribution3d: {
    volField: `vec3 q = p * {{scale}} + vec3(vTime * {{drift}} * 4.0, 0.0, 0.0);
float f = fbm3(q);
a += max(0.0, f - (1.0 - {{coverage}})) * {{density}};`,
  },
};
