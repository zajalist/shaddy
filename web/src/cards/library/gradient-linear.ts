// Linear gradient in an arbitrary direction. Use angle in radians.

import type { CardDef } from '../types';

export const GRADIENT_LINEAR: CardDef = {
  type: 'gradient_linear',
  category: 'shape',
  friendlyName: 'Linear gradient',
  description: 'Directional linear gradient.',
  icon: '▱',
  params: {
    angle: { kind: 'float', label: 'angle', default: 1.5708, min: 0, max: 6.2832, step: 0.05 },
    softness: { kind: 'float', label: 'softness', default: 1, min: 0.1, max: 4, step: 0.05 },
  },
  snippetTemplate: 'd = 0.5 + 0.5 * dot(uv, vec2(cos({{angle}}), sin({{angle}}))) * {{softness}};',
};
