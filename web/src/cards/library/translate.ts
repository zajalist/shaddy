// Shift UV by (x, y). Place above a shape to move it.

import type { CardDef } from '../types';

export const TRANSLATE: CardDef = {
  type: 'translate',
  category: 'distortion',
  friendlyName: 'Translate',
  description: 'Shift UV coordinates. Place above a shape block.',
  icon: '↔',
  params: {
    x: { kind: 'float', label: 'x', default: 0, min: -1.5, max: 1.5, step: 0.01 },
    y: { kind: 'float', label: 'y', default: 0, min: -1.5, max: 1.5, step: 0.01 },
  },
  snippetTemplate: 'uv -= vec2({{x}}, {{y}});',
};
