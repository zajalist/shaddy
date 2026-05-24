// Trapezoid SDF (iq's sdfTrapezoid). r1 = bottom half-width, r2 = top
// half-width, h = half-height.

import type { CardDef } from '../types';

export const TRAPEZOID: CardDef = {
  type: 'trapezoid',
  category: 'shape',
  friendlyName: 'Trapezoid',
  description: 'Trapezoid with independent top and bottom widths.',
  icon: '🔻',
  params: {
    bottom: { kind: 'float', label: 'bottom', default: 0.7, min: 0.05, max: 1.5, step: 0.01 },
    top: { kind: 'float', label: 'top', default: 0.4, min: 0.05, max: 1.5, step: 0.01 },
    height: { kind: 'float', label: 'height', default: 0.5, min: 0.05, max: 1.5, step: 0.01 },
    softness: { kind: 'float', label: 'softness', default: 0.02, min: 0, max: 0.5, step: 0.005 },
  },
  snippetTemplate:
    'd = 1.0 - smoothstep(-{{softness}}, {{softness}}, sdfTrapezoid(uv, {{bottom}}, {{top}}, {{height}}));',
  helpers: ['sdfTrapezoid'],
};
