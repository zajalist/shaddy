// Relief light — shade the current colour as if `d` were a height field lit
// from a direction. Uses the screen-space slope of d (dFdx/dFdy) as the
// surface normal, so flat coloured noise turns into 3D-looking relief. The
// single most useful primitive for making terrain / lava / waves read as real.

import type { CardDef } from '../types';

export const RELIEF_LIGHT: CardDef = {
  type: 'relief_light',
  category: 'effect',
  friendlyName: 'Relief light',
  description: 'Light the colour by the slope of d — fakes 3D relief.',
  icon: '🔦',
  io: { reads: ['d', 'col'], writes: ['col'] },
  params: {
    strength: { kind: 'float', label: 'strength', default: 8, min: 0, max: 40, step: 0.5 },
    light_x: { kind: 'float', label: 'light x', default: -0.5, min: -1, max: 1, step: 0.05 },
    light_y: { kind: 'float', label: 'light y', default: 0.6, min: -1, max: 1, step: 0.05 },
    amount: { kind: 'float', label: 'amount', default: 0.85, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    vec2 _grad = vec2(dFdx(d), dFdy(d)) * {{strength}};
    vec3 _n = normalize(vec3(-_grad, 1.0));
    vec3 _l = normalize(vec3({{light_x}}, {{light_y}}, 0.6));
    float _dif = clamp(dot(_n, _l), 0.0, 1.0);
    float _sh = 0.32 + 1.18 * _dif;
    col *= mix(1.0, _sh, {{amount}});
  }`,
};
