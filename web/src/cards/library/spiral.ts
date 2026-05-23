import type { CardDef } from '../types';

// Polar-coord spiral: angle/(2π) + radius*arms wraps via fract().

export const SPIRAL: CardDef = {
  type: 'spiral',
  category: 'shape',
  friendlyName: 'Spiral',
  description: 'Spiral arms around the canvas centre.',
  icon: '🌀',
  params: {
    arms: { kind: 'float', label: 'arms', default: 4, min: 0, max: 20, step: 0.1 },
    twist: { kind: 'float', label: 'twist', default: 3, min: -10, max: 10, step: 0.1 },
  },
  snippetTemplate:
    'd = fract(atan(uv.y, uv.x) / 6.2831 * {{arms}} + length(uv) * {{twist}});',
};
