// Two-wave interference — moiré-style overlapping ripples.

import type { CardDef } from '../types';

export const INTERFERENCE: CardDef = {
  type: 'interference',
  category: 'shape',
  friendlyName: 'Interference',
  description: 'Two ripple sources interfering — moiré bands.',
  icon: '◎',
  params: {
    freq: { kind: 'float', label: 'freq', default: 12, min: 1, max: 50, step: 0.1 },
    separation: { kind: 'float', label: 'separation', default: 0.4, min: 0, max: 2, step: 0.01 },
  },
  snippetTemplate: `{
    float _a = sin(length(uv - vec2({{separation}}, 0.0)) * {{freq}});
    float _b = sin(length(uv + vec2({{separation}}, 0.0)) * {{freq}});
    d = 0.5 + 0.5 * (_a + _b) * 0.5;
  }`,
};
