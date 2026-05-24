import type { BlockDef } from '../types';

export const STRIPES: BlockDef = {
  type: 'stripes',
  category: 'shape',
  friendlyName: 'Stripes',
  icon: 'Bars',
  description: 'Parallel bands along a direction vector.',
  params: {
    direction: {
      kind: 'vec2',
      default: [1, 0] as const,
      label: 'direction',
      animatable: false,
    },
    width: {
      kind: 'number',
      default: 8,
      min: 0.5,
      max: 30,
      step: 0.1,
      label: 'width',
      animatable: true,
    },
  },
  glsl: 'd = step(0.5, fract(dot(uv, {{direction}}) * {{width}}));',
};
