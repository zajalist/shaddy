// Book of Shaders — N-fold rose petals with optional double-loop.
// r = |cos(k * θ)| (single) OR mix into cos(k*θ/2)*cos(k*θ/2) for double-loops.

import type { CardDef } from '../types';

export const ROSE_PETALS: CardDef = {
  type: 'rose_petals',
  category: 'shape',
  friendlyName: 'Rose petals',
  description: 'N-fold rose with double-loop variant.',
  icon: '✿',
  params: {
    petals: { kind: 'float', label: 'petals', default: 6, min: 2, max: 24, step: 1 },
    double_loop: { kind: 'float', label: 'double loop', default: 0.4, min: 0, max: 1, step: 0.01 },
    thickness: { kind: 'float', label: 'thickness', default: 0.06, min: 0.005, max: 0.3, step: 0.005 },
  },
  snippetTemplate: `{
    float _r = length(uv);
    float _a = atan(uv.y, uv.x);
    float _single = abs(cos({{petals}} * _a));
    float _double = abs(cos({{petals}} * _a) * cos({{petals}} * _a * 0.5));
    float _rose = mix(_single, _double, {{double_loop}}) * 0.8;
    d = 1.0 - smoothstep({{thickness}}, {{thickness}} * 1.5, abs(_r - _rose));
  }`,
};
