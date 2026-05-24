// Hard threshold on d — produces crisp binary patterns from any shape.

import type { CardDef } from '../types';

export const THRESHOLD_D: CardDef = {
  type: 'threshold_d',
  category: 'distortion',
  friendlyName: 'Threshold',
  description: 'Hard threshold on d — binarises any shape.',
  icon: '⏤',
  params: {
    level: { kind: 'float', label: 'level', default: 0.5, min: 0, max: 1, step: 0.01 },
    softness: { kind: 'float', label: 'softness', default: 0.02, min: 0, max: 0.5, step: 0.005 },
  },
  snippetTemplate: 'd = smoothstep({{level}} - {{softness}}, {{level}} + {{softness}}, d);',
};
