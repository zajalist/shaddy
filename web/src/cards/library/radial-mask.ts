// Radial mask — fade the running scalar d toward the edges (or center). A
// shaping primitive: multiply d by a soft circular falloff so a field becomes
// a contained blob / vignetted shape. Reads + writes d.

import type { CardDef } from '../types';

export const RADIAL_MASK: CardDef = {
  type: 'radial_mask',
  category: 'distortion',
  friendlyName: 'Radial mask',
  description: 'Fade d with distance from center — contain a field to a blob.',
  icon: '⊙',
  io: { reads: ['uv', 'd'], writes: ['d'] },
  params: {
    radius: { kind: 'float', label: 'radius', default: 1, min: 0.1, max: 2, step: 0.01 },
    softness: { kind: 'float', label: 'softness', default: 0.6, min: 0.01, max: 1.5, step: 0.01 },
    invert: { kind: 'float', label: 'invert', default: 0, min: 0, max: 1, step: 1 },
  },
  snippetTemplate: `{
    float _m = 1.0 - smoothstep({{radius}} - {{softness}}, {{radius}}, length(uv));
    _m = mix(_m, 1.0 - _m, {{invert}});
    d *= _m;
  }`,
};
