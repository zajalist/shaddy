import type { CardDef } from '../types';

// Additive boost to the running scalar `d` near the pointer. Combine on
// top of a base shape to "highlight" wherever the user hovers — the
// boost falls off with distance from the cursor, raised to `power` so
// authors can sharpen or soften the brush.

export const MOUSE_PAINT_D: CardDef = {
  type: 'mouse_paint_d',
  category: 'distortion',
  friendlyName: 'Mouse Paint',
  description: 'Boost the running scalar near the mouse to highlight hover region.',
  icon: '✎',
  params: {
    power: { kind: 'float', label: 'power', default: 1.0, min: 0, max: 2, step: 0.01 },
  },
  snippetTemplate: `{
    float _md = length(uv - u_mouse);
    d += pow(max(0.0, 1.0 - _md), 2.0) * {{power}};
  }`,
};
