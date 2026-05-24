import type { BlockDef } from '../types';

export const TRIPLE_GRADIENT: BlockDef = {
  type: 'triple_gradient',
  category: 'color',
  friendlyName: 'Triple gradient',
  icon: 'PaintBucket',
  description: 'Three-colour gradient mapped to d (A at 0, B at 0.5, C at 1).',
  params: {
    colorA: { kind: 'color', default: [0.1, 0.05, 0.25] as const, label: 'colour A', animatable: true },
    colorB: { kind: 'color', default: [0.9, 0.3, 0.45] as const, label: 'colour B', animatable: true },
    colorC: { kind: 'color', default: [1, 0.85, 0.4] as const, label: 'colour C', animatable: true },
  },
  glsl:
    'col = mix(mix({{colorA}}, {{colorB}}, clamp(d * 2.0, 0.0, 1.0)), {{colorC}}, clamp((d - 0.5) * 2.0, 0.0, 1.0));',
};
