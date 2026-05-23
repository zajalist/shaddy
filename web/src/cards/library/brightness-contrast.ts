import type { CardDef } from '../types';

// Standard photographic adjust: lift midtones with contrast then shift overall
// brightness.

export const BRIGHTNESS_CONTRAST: CardDef = {
  type: 'brightness_contrast',
  category: 'effect',
  friendlyName: 'Brightness / contrast',
  description: 'Photographic brightness + contrast adjustment on the final colour.',
  icon: '◐',
  params: {
    brightness: { kind: 'float', label: 'brightness', default: 0, min: -1, max: 1, step: 0.01 },
    contrast: { kind: 'float', label: 'contrast', default: 1, min: 0, max: 3, step: 0.01 },
  },
  snippetTemplate: 'col = (col - 0.5) * {{contrast}} + 0.5 + {{brightness}};',
};
