// Rotate the hue of the current colour.

import type { CardDef } from '../types';

export const HUE_SHIFT: CardDef = {
  type: 'hue_shift',
  category: 'color',
  friendlyName: 'Hue shift',
  description: 'Rotate the hue of the current colour.',
  icon: '🎨',
  params: {
    shift: { kind: 'float', label: 'shift', default: 0, min: -1, max: 1, step: 0.005 },
  },
  snippetTemplate: `{
    vec3 _hsv = rgb2hsv(col);
    _hsv.x = fract(_hsv.x + {{shift}});
    col = hsv2rgb(_hsv);
  }`,
  helpers: ['rgb2hsv', 'hsv2rgb'],
};
