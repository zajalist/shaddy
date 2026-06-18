// Mandelbulb (3D) — the classic power-8 distance-estimated 3D fractal.

import type { CardDef } from '../types';

export const MANDELBULB_3D: CardDef = {
  type: 'mandelbulb_3d',
  category: 'shape',
  friendlyName: 'Mandelbulb',
  description: 'Distance-estimated 3D Mandelbrot bulb contribution to the scene.',
  icon: '🌀',
  mode: '3d',
  helpers: ['sdfMandelbulb3'],
  params: {
    power: { kind: 'float', label: 'power', default: 8, min: 2, max: 12, step: 0.1 },
    size: { kind: 'float', label: 'size', default: 1.2, min: 0.3, max: 3, step: 0.01 },
  },
  snippetTemplate: '// mandelbulb_3d (3D) power={{power}} size={{size}}',
  contribution3d: {
    sdfExpr: 'sdfMandelbulb3(p / {{size}}, {{power}}) * {{size}}',
  },
};
