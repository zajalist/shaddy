// Soft directional shadow falloff. Uses iq-style accumulation along a
// shadow direction; `d` stands in for distance-to-surface. Higher softness =
// tighter, harder shadow edge.

import type { CardDef } from '../types';

export const SOFT_SHADOW: CardDef = {
  type: 'soft_shadow',
  category: 'effect',
  friendlyName: 'Soft shadow',
  description: 'Soft shadow falloff along a chosen direction.',
  icon: '🌒',
  params: {
    shadow_dir_x: { kind: 'float', label: 'dir x', default: 0.5, min: -1, max: 1, step: 0.01 },
    shadow_dir_y: { kind: 'float', label: 'dir y', default: -0.5, min: -1, max: 1, step: 0.01 },
    softness: { kind: 'float', label: 'softness', default: 8, min: 1, max: 64, step: 0.5 },
    strength: { kind: 'float', label: 'strength', default: 0.6, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    vec2 _dir = normalize(vec2({{shadow_dir_x}}, {{shadow_dir_y}}) + vec2(1e-6));
    float _proj = dot(uv, _dir);
    float _s = 1.0;
    for (int i = 1; i <= 16; i++) {
      float _t = float(i) * 0.04;
      float _sample = clamp(0.5 + 0.5 * cos(d * 6.2831 - _proj * 3.0 - _t), 0.0, 1.0);
      _s = min(_s, {{softness}} * _sample / _t);
    }
    col *= mix(1.0, clamp(_s, 0.0, 1.0), {{strength}});
  }`,
};
