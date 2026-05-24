// Shadows / midtones / highlights — three-tone mapping.

import type { CardDef } from '../types';

export const TRITONE: CardDef = {
  type: 'tritone',
  category: 'color',
  friendlyName: 'Tritone',
  description: 'Shadows / midtones / highlights three-tone.',
  icon: '◓',
  params: {
    shadow: { kind: 'color', label: 'shadow', default: [0.1, 0.05, 0.25] },
    mid: { kind: 'color', label: 'midtone', default: [0.85, 0.4, 0.35] },
    highlight: { kind: 'color', label: 'highlight', default: [1, 0.95, 0.6] },
    mid_pos: { kind: 'float', label: 'mid pos', default: 0.5, min: 0.05, max: 0.95, step: 0.01 },
  },
  snippetTemplate: `{
    float _t = clamp(d, 0.0, 1.0);
    col = mix({{shadow}}, {{mid}}, smoothstep(0.0, {{mid_pos}}, _t));
    col = mix(col, {{highlight}}, smoothstep({{mid_pos}}, 1.0, _t));
  }`,
};
