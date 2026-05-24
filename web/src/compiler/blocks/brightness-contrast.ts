import type { BlockDef } from '../types';

export const BRIGHTNESS_CONTRAST: BlockDef = {
  type: 'brightness_contrast',
  category: 'effect',
  friendlyName: 'Brightness / contrast',
  icon: 'SunDim',
  description: 'Photographic brightness + contrast on the final colour.',
  params: {
    brightness: { kind: 'number', default: 0, min: -1, max: 1, step: 0.01, label: 'brightness', animatable: true },
    contrast: { kind: 'number', default: 1, min: 0, max: 3, step: 0.01, label: 'contrast', animatable: true },
  },
  glsl: 'col = (col - 0.5) * {{contrast}} + 0.5 + {{brightness}};',
};
