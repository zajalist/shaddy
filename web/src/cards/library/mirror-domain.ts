// Tiled-and-mirrored domain repetition — uv = abs(mod(uv * count, 2) - 1).
// Gives a kaleidoscope-lite without polar coords. Place above a shape card.

import type { CardDef } from '../types';

export const MIRROR_DOMAIN: CardDef = {
  type: 'mirror_domain',
  category: 'distortion',
  friendlyName: 'Mirror domain',
  description: 'Repeating mirrored UV tiles — kaleidoscope-lite.',
  icon: '◫',
  params: {
    count: { kind: 'float', label: 'count', default: 3, min: 1, max: 16, step: 0.1 },
  },
  snippetTemplate: 'uv = abs(mod(uv * {{count}}, 2.0) - 1.0);',
};
