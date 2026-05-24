import type { BlockDef } from '../types';

export const VORONOI: BlockDef = {
  type: 'voronoi',
  category: 'shape',
  friendlyName: 'Voronoi',
  icon: 'Hexagon',
  description: 'Cellular noise — distance to nearest jittered cell seed.',
  params: {
    scale: {
      kind: 'number',
      default: 5,
      min: 1,
      max: 20,
      step: 0.1,
      label: 'scale',
      animatable: true,
    },
    jitter: {
      kind: 'number',
      default: 1,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'jitter',
      animatable: true,
    },
  },
  glsl: 'd = voronoi(uv * {{scale}}, {{jitter}});',
  helpers: ['voronoi'],
};
