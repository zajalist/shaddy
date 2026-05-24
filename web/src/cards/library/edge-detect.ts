// Per-pixel gradient on luminance using fwidth-style derivatives.

import type { CardDef } from '../types';

export const EDGE_DETECT: CardDef = {
  type: 'edge_detect',
  category: 'effect',
  friendlyName: 'Edge detect',
  description: 'Highlight rapid changes in colour — sobel-ish.',
  icon: '⌐',
  params: {
    strength: { kind: 'float', label: 'strength', default: 1, min: 0, max: 3, step: 0.05 },
    color: { kind: 'color', label: 'edge colour', default: [1, 1, 1] },
  },
  snippetTemplate: `{
    float _lum = dot(col, vec3(0.299, 0.587, 0.114));
    float _e = length(vec2(dFdx(_lum), dFdy(_lum))) * 50.0 * {{strength}};
    col = mix(col, {{color}}, clamp(_e, 0.0, 1.0));
  }`,
};
