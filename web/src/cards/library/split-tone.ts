// Tint shadows one colour and highlights another (without losing midtone hue).

import type { CardDef } from '../types';

export const SPLIT_TONE: CardDef = {
  type: 'split_tone',
  category: 'color',
  friendlyName: 'Split tone',
  description: 'Tint shadows + highlights independently.',
  icon: '⫷',
  params: {
    shadow_tint: { kind: 'color', label: 'shadow tint', default: [0.3, 0.5, 0.9] },
    highlight_tint: { kind: 'color', label: 'highlight tint', default: [1, 0.8, 0.5] },
    strength: { kind: 'float', label: 'strength', default: 0.4, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    float _lum = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 _shadow = col * {{shadow_tint}} * 2.0;
    vec3 _hi = col * {{highlight_tint}} * 2.0;
    col = mix(col, mix(_shadow, _hi, _lum), {{strength}});
  }`,
};
