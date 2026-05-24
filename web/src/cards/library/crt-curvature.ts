// Pinch the corners + darken edges — like a CRT bezel.

import type { CardDef } from '../types';

export const CRT_CURVATURE: CardDef = {
  type: 'crt_curvature',
  category: 'effect',
  friendlyName: 'CRT curvature',
  description: 'Bezel darkening that mimics CRT screen curvature.',
  icon: '📺',
  params: {
    strength: { kind: 'float', label: 'strength', default: 0.3, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    vec2 _u = uv;
    float _v = (1.0 - smoothstep(0.85, 1.15, abs(_u.x))) * (1.0 - smoothstep(0.85, 1.15, abs(_u.y)));
    col *= mix(1.0, _v, {{strength}});
  }`,
};
