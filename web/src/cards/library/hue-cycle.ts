import type { CardDef } from '../types';

// Map d to a rotating hue. Saturation + brightness control the look.

export const HUE_CYCLE: CardDef = {
  type: 'hue_cycle',
  category: 'color',
  friendlyName: 'Hue cycle',
  description: 'Map d to a rotating hue around the colour wheel.',
  icon: '🌈',
  params: {
    cycles: { kind: 'float', label: 'cycles', default: 1, min: 0, max: 5, step: 0.05 },
    phase: { kind: 'float', label: 'phase', default: 0, min: 0, max: 1, step: 0.01 },
    saturation: { kind: 'float', label: 'saturation', default: 0.8, min: 0, max: 1, step: 0.01 },
    brightness: { kind: 'float', label: 'brightness', default: 1, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate:
    'col = hsv2rgb(vec3(d * {{cycles}} + {{phase}}, {{saturation}}, {{brightness}}));',
  helpers: ['hsv2rgb'],
};
