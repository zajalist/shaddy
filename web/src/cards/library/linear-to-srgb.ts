// Linear → sRGB conversion via the standard 2.2 gamma approximation. Place
// at the very end of the recipe if your earlier effects assumed linear-space
// blending. amount lets you dial the correction in/out.

import type { CardDef } from '../types';

export const LINEAR_TO_SRGB: CardDef = {
  type: 'linear_to_srgb',
  category: 'effect',
  friendlyName: 'Linear → sRGB',
  description: 'Gamma-encode linear colour for display (pow 1/2.2).',
  icon: '🌗',
  params: {
    amount: { kind: 'float', label: 'amount', default: 1, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    vec3 _g = pow(max(col, 0.0), vec3(1.0 / 2.2));
    col = mix(col, _g, {{amount}});
  }`,
};
