import type { BlockDef } from '../types';

export const HUE_CYCLE: BlockDef = {
  type: 'hue_cycle',
  category: 'color',
  friendlyName: 'Hue cycle',
  icon: 'Rainbow',
  description: 'Map d to a rotating hue around the colour wheel.',
  params: {
    speed: {
      kind: 'number',
      default: 1,
      min: 0,
      max: 5,
      step: 0.05,
      label: 'speed',
      animatable: true,
    },
    saturation: {
      kind: 'number',
      default: 0.85,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'saturation',
      animatable: true,
    },
    brightness: {
      kind: 'number',
      default: 1,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'brightness',
      animatable: true,
    },
  },
  glsl: 'col = hsv2rgb(vec3(d * {{speed}}, {{saturation}}, {{brightness}}));',
  helpers: ['hsv2rgb'],
};
