// Book of Shaders — N-gon SDFs at increasing radii (onion-skin polygons).

import type { CardDef } from '../types';

export const CONCENTRIC_POLYGONS: CardDef = {
  type: 'concentric_polygons',
  category: 'shape',
  friendlyName: 'Concentric polygons',
  description: 'N-gon SDF onion-skin bands.',
  icon: '⬡',
  params: {
    sides: { kind: 'float', label: 'sides', default: 6, min: 3, max: 12, step: 1 },
    rings: { kind: 'float', label: 'rings', default: 6, min: 1, max: 20, step: 0.5 },
    edge: { kind: 'float', label: 'edge', default: 0.04, min: 0.005, max: 0.3, step: 0.005 },
  },
  snippetTemplate: `{
    float _sd = sdfPolyN(uv, 0.9, int({{sides}}));
    float _b = fract(_sd * {{rings}});
    d = 1.0 - smoothstep({{edge}}, {{edge}} + 0.04, abs(_b - 0.5) * 2.0);
  }`,
  helpers: ['sdfPolyN'],
};
