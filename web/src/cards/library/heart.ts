import type { CardDef } from '../types';

export const HEART: CardDef = {
  type: 'heart',
  category: 'shape',
  friendlyName: 'Heart',
  description: 'Romantic heart SDF (iq).',
  icon: '♥',
  params: {
    size: { kind: 'float', label: 'size', default: 0.7, min: 0.1, max: 2, step: 0.01 },
    edge: { kind: 'float', label: 'edge', default: 0.01, min: 0.001, max: 0.2, step: 0.001 },
  },
  snippetTemplate:
    'd = 1.0 - smoothstep(-{{edge}}, {{edge}}, sdfHeart(uv * vec2(1.0, -1.0) / {{size}}));',
  helpers: ['sdfHeart'],
};
