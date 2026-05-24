import type { BlockDef } from '../types';

export const SWIRL: BlockDef = {
  type: 'swirl',
  category: 'distortion',
  friendlyName: 'Swirl',
  icon: 'ArrowsClockwise',
  description: 'Twist UV space around the centre. Place above a shape block.',
  params: {
    center: {
      kind: 'vec2',
      default: [0, 0] as const,
      label: 'centre',
      animatable: false,
    },
    strength: {
      kind: 'number',
      default: 2,
      min: -10,
      max: 10,
      step: 0.1,
      label: 'strength',
      animatable: true,
    },
  },
  glsl: 'uv = rotate2d(length(uv - {{center}}) * {{strength}}) * (uv - {{center}}) + {{center}};',
  helpers: ['rotate2d'],
};
