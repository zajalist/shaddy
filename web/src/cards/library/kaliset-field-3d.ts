// Kaliset field (3D) — the density function for a volumetric march: the folded
// "kaliset" fractal from Star Nest (Pablo Roman Andrioli, MIT). Emitted as
// volField(p); the Volume march block samples it each step. Tune fractal/tile.

import type { CardDef } from '../types';

export const KALISET_FIELD_3D: CardDef = {
  type: 'kaliset_field_3d',
  category: 'shape',
  friendlyName: 'Kaliset field',
  description: 'Folded kaliset fractal density (Star Nest) for volume marching.',
  icon: '✦',
  params: {
    formu: { kind: 'float', label: 'fractal', default: 0.53, min: 0.3, max: 0.9, step: 0.01 },
    tile: { kind: 'float', label: 'tile', default: 0.85, min: 0.4, max: 1.5, step: 0.01 },
  },
  snippetTemplate: '// kaliset_field fractal={{formu}} tile={{tile}}',
  contribution3d: {
    volField: 'vec3 q = abs(vec3({{tile}}) - mod(p, vec3({{tile}} * 2.0))); float pa = 0.0; for (int i = 0; i < 17; i++) { q = abs(q) / dot(q, q) - {{formu}}; a += abs(length(q) - pa); pa = length(q); }',
  },
};
