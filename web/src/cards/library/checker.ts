import type { CardDef } from '../types';

export const CHECKER: CardDef = {
  type: 'checker',
  category: 'shape',
  friendlyName: 'Checker',
  description: 'Checkerboard pattern. Pair with a colour card to actually see it.',
  icon: '▣',
  params: {
    scale: { kind: 'float', label: 'scale', default: 6, min: 1, max: 30, step: 0.1 },
  },
  snippetTemplate:
    'd = step(0.5, mod(floor(uv.x * {{scale}}) + floor(uv.y * {{scale}}), 2.0));',
};
