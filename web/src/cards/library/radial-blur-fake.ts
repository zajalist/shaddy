// Fake radial blur — radial brightness wash without per-pixel sampling.

import type { CardDef } from '../types';

export const RADIAL_BLUR_FAKE: CardDef = {
  type: 'radial_blur_fake',
  category: 'effect',
  friendlyName: 'Radial wash',
  description: 'Radial brightness wash that mimics zoom-blur cheaply.',
  icon: '◎',
  params: {
    strength: { kind: 'float', label: 'strength', default: 0.4, min: 0, max: 2, step: 0.01 },
  },
  snippetTemplate: `{
    float _r = length(uv);
    col += col * smoothstep(0.0, 1.0, _r) * {{strength}};
  }`,
};
