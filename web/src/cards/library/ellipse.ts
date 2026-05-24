// Ellipse SDF — separate semi-axes a, b.

import type { CardDef } from '../types';

export const ELLIPSE: CardDef = {
  type: 'ellipse',
  category: 'shape',
  friendlyName: 'Ellipse',
  description: 'Ellipse with separate semi-axes (iq closed-form).',
  icon: '⬭',
  params: {
    ax: { kind: 'float', label: 'a (x)', default: 0.6, min: 0.05, max: 1.5, step: 0.01 },
    by: { kind: 'float', label: 'b (y)', default: 0.35, min: 0.05, max: 1.5, step: 0.01 },
    edge: { kind: 'float', label: 'edge', default: 0.01, min: 0.001, max: 0.2, step: 0.001 },
  },
  snippetTemplate:
    'd = 1.0 - smoothstep(-{{edge}}, {{edge}}, sdfEllipse(uv, vec2({{ax}}, {{by}})));',
  helpers: ['sdfEllipse'],
};
