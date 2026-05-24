import type { CardDef } from '../types';

export const TRIANGLE: CardDef = {
  type: 'triangle',
  category: 'shape',
  friendlyName: 'Triangle',
  description: 'Equilateral triangle.',
  icon: '▲',
  params: {
    size: { kind: 'float', label: 'size', default: 0.55, min: 0.05, max: 1.5, step: 0.01 },
    edge: { kind: 'float', label: 'edge', default: 0.01, min: 0.001, max: 0.2, step: 0.001 },
  },
  snippetTemplate: 'd = 1.0 - smoothstep(-{{edge}}, {{edge}}, sdfTri(uv, {{size}}));',
  helpers: ['sdfTri'],
};
