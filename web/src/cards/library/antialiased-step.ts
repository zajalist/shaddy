// fwidth-aware smoothstep on `d`. Replaces a hard step(level, d) with a
// pixel-perfect transition that stays crisp at any zoom — width derives
// from screen-space derivatives of d.

import type { CardDef } from '../types';

export const ANTIALIASED_STEP: CardDef = {
  type: 'antialiased_step',
  category: 'distortion',
  friendlyName: 'AA step',
  description: 'Pixel-accurate step on d using fwidth — zoom-invariant edges.',
  icon: '⎍',
  params: {
    level: { kind: 'float', label: 'level', default: 0.5, min: 0, max: 1, step: 0.01 },
    width_scale: { kind: 'float', label: 'width', default: 1, min: 0.1, max: 8, step: 0.05 },
  },
  snippetTemplate: `{
    float _w = fwidth(d) * {{width_scale}};
    d = smoothstep({{level}} - _w, {{level}} + _w, d);
  }`,
};
