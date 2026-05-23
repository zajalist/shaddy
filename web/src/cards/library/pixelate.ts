import type { CardDef } from '../types';

// Snap UV to a coarse grid. Place ABOVE a shape card to pixelate it.

export const PIXELATE: CardDef = {
  type: 'pixelate',
  category: 'distortion',
  friendlyName: 'Pixelate',
  description: 'Snap UV space to a grid. Place above a shape card.',
  icon: '▦',
  params: {
    grid: { kind: 'float', label: 'grid', default: 20, min: 4, max: 100, step: 1 },
  },
  snippetTemplate: 'uv = floor(uv * {{grid}}) / {{grid}};',
};
