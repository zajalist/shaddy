import type { BlockDef } from '../types';

export const GRAIN: BlockDef = {
  type: 'grain',
  category: 'effect',
  friendlyName: 'Grain',
  icon: 'Television',
  description: 'Film-grain analog seeded by time so it shimmers.',
  params: {
    amount: {
      kind: 'number',
      default: 0.05,
      min: 0,
      max: 0.5,
      step: 0.005,
      label: 'amount',
      animatable: true,
    },
  },
  glsl: 'col += vec3((hash(uv + fract(u_time)) - 0.5) * {{amount}});',
  helpers: ['hash'],
};
