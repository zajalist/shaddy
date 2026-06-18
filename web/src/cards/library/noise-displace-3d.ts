// Noise displace (3D) — warps the marched point `p` by fbm noise before the
// surfaces that follow, roughening them (bumpy terrain, choppy water, lumpy
// SDFs). A domain-distortion block for the raymarcher.

import type { CardDef } from '../types';

export const NOISE_DISPLACE_3D: CardDef = {
  type: 'noise_displace_3d',
  category: 'distortion',
  friendlyName: 'Noise displace',
  description: 'Bump subsequent 3D surfaces with fbm noise.',
  icon: '🌊',
  mode: '3d',
  helpers: ['fbm2'],
  params: {
    scale: { kind: 'float', label: 'scale', default: 1.5, min: 0.2, max: 8, step: 0.1 },
    amount: { kind: 'float', label: 'amount', default: 0.2, min: 0, max: 1.5, step: 0.01 },
  },
  snippetTemplate: '// noise_displace_3d (3D) scale={{scale}} amount={{amount}}',
  contribution3d: {
    domainExpr: 'p + (vec3(fbm2(p.xz * {{scale}}), fbm2(p.yz * {{scale}} + 11.0), fbm2(p.xy * {{scale}} + 23.0)) - 0.5) * {{amount}}',
  },
};
