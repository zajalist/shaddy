// Fake sphere ambient-occlusion — darkens based on distance from a centre,
// giving the canvas a globe-like volumetric look.

import type { CardDef } from '../types';

export const SPHERE_AO: CardDef = {
  type: 'sphere_ao',
  category: 'effect',
  friendlyName: 'Sphere AO',
  description: 'Fake spherical ambient occlusion — globe shading.',
  icon: '🌑',
  params: {
    radius: { kind: 'float', label: 'radius', default: 0.9, min: 0.1, max: 2, step: 0.01 },
    strength: { kind: 'float', label: 'strength', default: 0.7, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    float _r = length(uv) / {{radius}};
    float _ao = 1.0 - {{strength}} * smoothstep(0.0, 1.0, _r);
    col *= _ao;
  }`,
};
