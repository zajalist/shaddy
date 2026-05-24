// Scale UV toward the centre — fakes the pre-render half of a zoom blur.

import type { CardDef } from '../types';

export const ZOOM_BLUR_UV: CardDef = {
  type: 'zoom_blur_uv',
  category: 'distortion',
  friendlyName: 'Zoom blur (UV)',
  description: 'Pull UV toward the centre — pre-render half of a zoom blur.',
  icon: '🎯',
  params: {
    strength: { kind: 'float', label: 'strength', default: 0.2, min: -1, max: 1, step: 0.01 },
  },
  snippetTemplate: 'uv *= 1.0 - {{strength}} * length(uv) * 0.5;',
};
