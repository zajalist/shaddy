// Send UV through (r, θ) — anything that was "stripes" becomes "rings",
// anything that was "rings" becomes "stripes".

import type { CardDef } from '../types';

export const POLAR_WARP: CardDef = {
  type: 'polar_warp',
  category: 'distortion',
  friendlyName: 'Polar warp',
  description: 'Remap UV into polar coords — rings ↔ stripes.',
  icon: '◐',
  params: {
    radial_scale: { kind: 'float', label: 'radial scale', default: 1, min: 0.1, max: 5, step: 0.05 },
  },
  snippetTemplate: 'uv = vec2(length(uv) * {{radial_scale}}, atan(uv.y, uv.x) / 3.14159);',
};
