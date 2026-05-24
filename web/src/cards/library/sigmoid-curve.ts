// Sigmoid (logistic) remap of d: 1 / (1 + exp(-k * (d - mid))). Sharp
// S-curve with adjustable midpoint and slope. Higher k = closer to a step.

import type { CardDef } from '../types';

export const SIGMOID_CURVE: CardDef = {
  type: 'sigmoid_curve',
  category: 'distortion',
  friendlyName: 'Sigmoid',
  description: 'Logistic sigmoid remap on d.',
  icon: '𝛔',
  params: {
    mid: { kind: 'float', label: 'mid', default: 0.5, min: -1, max: 2, step: 0.01 },
    k: { kind: 'float', label: 'k', default: 8, min: 0.1, max: 64, step: 0.1 },
  },
  snippetTemplate: 'd = 1.0 / (1.0 + exp(-{{k}} * (d - {{mid}})));',
};
