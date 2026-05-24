// Soft-min the current d toward a target value. Acts as a soft "floor" or
// gentle pull, like blending the previous shape into a constant field.
// Distortion card — recipe schema doesn't yet support multi-shape combiners,
// so the second operand is a scalar target rather than another card's d.

import type { CardDef } from '../types';

export const SMOOTH_MIN_D: CardDef = {
  type: 'smooth_min_d',
  category: 'distortion',
  friendlyName: 'Smooth-min d',
  description: 'Soft-min current d toward a target value (iq smin).',
  icon: '◡',
  params: {
    target: { kind: 'float', label: 'target', default: 0.5, min: 0, max: 1, step: 0.01 },
    softness: { kind: 'float', label: 'softness', default: 0.1, min: 0.001, max: 0.5, step: 0.005 },
  },
  snippetTemplate: `{
    float _h = clamp(0.5 + 0.5 * (({{target}}) - d) / ({{softness}}), 0.0, 1.0);
    d = mix(({{target}}), d, _h) - ({{softness}}) * _h * (1.0 - _h);
  }`,
};
