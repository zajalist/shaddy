// Map d → full hue spectrum at given saturation/value. Different from hue_cycle
// which animates; this is a one-shot rainbow tied to d.

import type { CardDef } from '../types';

export const RAINBOW_D: CardDef = {
  type: 'rainbow_d',
  category: 'color',
  friendlyName: 'Rainbow d',
  description: 'Map d straight to a hue rotation.',
  icon: '🌈',
  params: {
    sat: { kind: 'float', label: 'saturation', default: 0.8, min: 0, max: 1, step: 0.01 },
    val: { kind: 'float', label: 'brightness', default: 1, min: 0, max: 1, step: 0.01 },
    offset: { kind: 'float', label: 'offset', default: 0, min: 0, max: 1, step: 0.005 },
  },
  snippetTemplate: 'col = hsv2rgb(vec3(fract(d + {{offset}}), {{sat}}, {{val}}));',
  helpers: ['hsv2rgb'],
};
