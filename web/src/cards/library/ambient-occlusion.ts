// Distance-field ambient occlusion. Uses the current `d` as a proximity
// proxy — pixels near a surface (d small) get darkened. Multiplies col by
// the ao factor for a soft contact-shadow look without needing real normals.

import type { CardDef } from '../types';

export const AMBIENT_OCCLUSION: CardDef = {
  type: 'ambient_occlusion',
  category: 'effect',
  friendlyName: 'Ambient occlusion',
  description: 'Field-based AO — darkens close to surfaces.',
  icon: '⚫',
  params: {
    radius: { kind: 'float', label: 'radius', default: 0.5, min: 0.01, max: 2, step: 0.01 },
    strength: { kind: 'float', label: 'strength', default: 0.7, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    float _ao = 1.0 - {{strength}} * (1.0 - smoothstep(0.0, {{radius}}, abs(d)));
    col *= _ao;
  }`,
};
