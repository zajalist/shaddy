// Schlick fresnel — strengthens colour at glancing angles. With no normals
// available we use length(uv) as a "view angle proxy" — edges get the rim
// boost just like an actual fresnel term on a sphere viewed head-on.

import type { CardDef } from '../types';

export const FRESNEL: CardDef = {
  type: 'fresnel',
  category: 'effect',
  friendlyName: 'Fresnel',
  description: 'Schlick fresnel — edge glow approximation.',
  icon: '✨',
  params: {
    f0: { kind: 'float', label: 'f0', default: 0.04, min: 0, max: 1, step: 0.01 },
    power: { kind: 'float', label: 'power', default: 5, min: 1, max: 8, step: 0.05 },
    tint: { kind: 'color', label: 'tint', default: [1, 1, 1] },
  },
  snippetTemplate: `{
    float _vdotn = clamp(1.0 - length(uv), 0.0, 1.0);
    float _f = {{f0}} + (1.0 - {{f0}}) * pow(1.0 - _vdotn, {{power}});
    col += {{tint}} * _f;
  }`,
};
