// Outline-only of isocurves at regular d intervals.

import type { CardDef } from '../types';

export const CONTOUR: CardDef = {
  type: 'contour',
  category: 'distortion',
  friendlyName: 'Contour',
  description: 'Isocurves at regular d intervals — topographic lines.',
  icon: '〰',
  params: {
    spacing: { kind: 'float', label: 'spacing', default: 0.1, min: 0.01, max: 0.5, step: 0.005 },
    thickness: { kind: 'float', label: 'thickness', default: 0.02, min: 0.001, max: 0.2, step: 0.001 },
  },
  snippetTemplate: 'd = 1.0 - smoothstep(0.0, {{thickness}}, abs(fract(d / {{spacing}}) - 0.5) * {{spacing}});',
};
