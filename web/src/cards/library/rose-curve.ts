// Rose / rhodonea curve — r = cos(k * θ). Pretty floral petals.

import type { CardDef } from '../types';

export const ROSE_CURVE: CardDef = {
  type: 'rose_curve',
  category: 'shape',
  friendlyName: 'Rose curve',
  description: 'Petals — r = cos(k * θ).',
  icon: '🌹',
  params: {
    petals: { kind: 'float', label: 'petals', default: 5, min: 1, max: 20, step: 1 },
    thickness: { kind: 'float', label: 'thickness', default: 0.06, min: 0.005, max: 0.3, step: 0.005 },
  },
  snippetTemplate: `{
    float _r = length(uv);
    float _a = atan(uv.y, uv.x);
    float _rose = abs(cos({{petals}} * _a));
    d = 1.0 - smoothstep({{thickness}}, {{thickness}} * 1.5, abs(_r - _rose * 0.8));
  }`,
};
