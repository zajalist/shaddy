// Regular pentagon SDF via the generic n-gon helper (n = 5).

import type { CardDef } from '../types';

export const PENTAGON: CardDef = {
  type: 'pentagon',
  category: 'shape',
  friendlyName: 'Pentagon',
  description: 'Regular 5-sided polygon.',
  icon: '⬠',
  params: {
    size: { kind: 'float', label: 'size', default: 0.5, min: 0.05, max: 1.5, step: 0.01 },
    edge: { kind: 'float', label: 'edge', default: 0.01, min: 0.001, max: 0.2, step: 0.001 },
  },
  snippetTemplate: 'd = 1.0 - smoothstep(-{{edge}}, {{edge}}, sdfPolyN(uv, {{size}}, 5));',
  helpers: ['sdfPolyN'],
};
