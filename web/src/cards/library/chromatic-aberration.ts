// Fake RGB-split — multiplies the three colour channels by slightly different
// radial falloffs. Cheap; not a real per-channel sample but visually similar.

import type { CardDef } from '../types';

export const CHROMATIC_ABERRATION: CardDef = {
  type: 'chromatic_aberration',
  category: 'effect',
  friendlyName: 'Chromatic aberration',
  description: 'Fake RGB-split — radial colour fringing.',
  icon: '🔴',
  params: {
    strength: { kind: 'float', label: 'strength', default: 0.04, min: 0, max: 0.4, step: 0.001 },
  },
  snippetTemplate: `{
    float _r2 = dot(uv, uv);
    col.r *= 1.0 + {{strength}} * _r2;
    col.b *= 1.0 - {{strength}} * _r2;
  }`,
};
