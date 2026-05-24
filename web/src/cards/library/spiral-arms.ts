// Logarithmic spiral arms — galactic / hypnotic.

import type { CardDef } from '../types';

export const SPIRAL_ARMS: CardDef = {
  type: 'spiral_arms',
  category: 'shape',
  friendlyName: 'Spiral arms',
  description: 'Log-spiral arms — galactic look.',
  icon: '🌌',
  params: {
    arms: { kind: 'float', label: 'arms', default: 3, min: 1, max: 12, step: 1 },
    twist: { kind: 'float', label: 'twist', default: 4, min: 0.1, max: 12, step: 0.1 },
    softness: { kind: 'float', label: 'softness', default: 0.4, min: 0.01, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    float _r = length(uv);
    float _a = atan(uv.y, uv.x);
    float _v = sin({{arms}} * _a + log(_r + 0.01) * {{twist}});
    d = smoothstep(-{{softness}}, {{softness}}, _v);
  }`,
};
