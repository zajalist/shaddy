// Solid square SDF, smooth edge.

import type { CardDef } from '../types';

export const SQUARE: CardDef = {
  type: 'square',
  category: 'shape',
  friendlyName: 'Square',
  description: 'Filled square centred on origin.',
  icon: '◼',
  params: {
    size: { kind: 'float', label: 'size', default: 0.5, min: 0.05, max: 1.5, step: 0.01 },
    edge: { kind: 'float', label: 'edge', default: 0.01, min: 0.001, max: 0.2, step: 0.001 },
  },
  snippetTemplate: 'd = 1.0 - smoothstep(-{{edge}}, {{edge}}, sdfBox(uv, vec2({{size}})));',
  helpers: ['sdfBox'],
};
