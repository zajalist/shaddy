// VHS-style horizontal noise bands + colour shift in random rows.

import type { CardDef } from '../types';

export const VHS_GLITCH: CardDef = {
  type: 'vhs_glitch',
  category: 'effect',
  friendlyName: 'VHS glitch',
  description: 'Horizontal band noise + tracking-error tint.',
  icon: '📼',
  params: {
    amount: { kind: 'float', label: 'amount', default: 0.2, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    float _band = step(0.96, hash21(vec2(0.0, floor(uv.y * 80.0 + u_time * 5.0))));
    col.r += _band * 0.15 * {{amount}};
    col.b += _band * 0.1 * {{amount}};
    col -= _band * 0.05 * {{amount}};
  }`,
  helpers: ['hash21'],
};
