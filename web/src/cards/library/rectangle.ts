import type { CardDef } from '../types';

export const RECTANGLE: CardDef = {
  type: 'rectangle',
  category: 'shape',
  friendlyName: 'Rectangle',
  description: 'Filled rectangle with separate width and height.',
  icon: '▭',
  params: {
    width: { kind: 'float', label: 'width', default: 0.7, min: 0.05, max: 1.5, step: 0.01 },
    height: { kind: 'float', label: 'height', default: 0.4, min: 0.05, max: 1.5, step: 0.01 },
    edge: { kind: 'float', label: 'edge', default: 0.01, min: 0.001, max: 0.2, step: 0.001 },
  },
  snippetTemplate:
    'd = 1.0 - smoothstep(-{{edge}}, {{edge}}, sdfBox(uv, vec2({{width}}, {{height}})));',
  helpers: ['sdfBox'],
};
