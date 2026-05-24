// Book of Shaders — concentric square bands via fract(max(|x|,|y|) * N).

import type { CardDef } from '../types';

export const CONCENTRIC_SQUARES: CardDef = {
  type: 'concentric_squares',
  category: 'shape',
  friendlyName: 'Concentric squares',
  description: 'Square bands from origin.',
  icon: '◫',
  params: {
    count: { kind: 'float', label: 'count', default: 8, min: 1, max: 30, step: 0.5 },
    width: { kind: 'float', label: 'width', default: 0.5, min: 0.05, max: 0.95, step: 0.01 },
  },
  snippetTemplate: `{
    float _r = max(abs(uv.x), abs(uv.y));
    float _b = fract(_r * {{count}});
    d = 1.0 - smoothstep({{width}}, {{width}} + 0.04, abs(_b - 0.5) * 2.0);
  }`,
};
