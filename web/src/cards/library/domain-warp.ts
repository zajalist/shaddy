// Sample noise at coordinates that are themselves displaced by another noise
// call. iq's classic — produces marbled, fluid, almost paint-like patterns.

import type { CardDef } from '../types';

export const DOMAIN_WARP: CardDef = {
  type: 'domain_warp',
  category: 'shape',
  friendlyName: 'Domain warp',
  description: 'Noise sampled at noise-warped coords — marble / fluid look.',
  icon: '🌀',
  params: {
    scale: { kind: 'float', label: 'scale', default: 2, min: 0.5, max: 10, step: 0.1 },
    warp: { kind: 'float', label: 'warp', default: 1.2, min: 0, max: 4, step: 0.05 },
  },
  snippetTemplate: `{
    vec2 _q = vec2(fbm2(uv * {{scale}}), fbm2(uv * {{scale}} + 5.0));
    d = fbm2(uv * {{scale}} + _q * {{warp}});
  }`,
  helpers: ['fbm2'],
};
