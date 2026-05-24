// Rim-light halo — boosts colour near the edge of the canvas (or a chosen
// rim falloff) by adding a tint scaled by 1 - smoothstep(falloff, 1, r).

import type { CardDef } from '../types';

export const RIM_LIGHT: CardDef = {
  type: 'rim_light',
  category: 'effect',
  friendlyName: 'Rim light',
  description: 'Edge halo — boosts colour where the rim is.',
  icon: '◯',
  params: {
    color: { kind: 'color', label: 'colour', default: [1, 0.9, 0.7] },
    falloff: { kind: 'float', label: 'falloff', default: 0.55, min: 0, max: 1, step: 0.01 },
    intensity: { kind: 'float', label: 'intensity', default: 0.8, min: 0, max: 3, step: 0.01 },
  },
  snippetTemplate: `{
    float _rim = smoothstep({{falloff}}, 1.0, length(uv));
    col += {{color}} * _rim * {{intensity}};
  }`,
};
