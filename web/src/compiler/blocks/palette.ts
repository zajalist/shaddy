import type { BlockDef } from '../types';

export const PALETTE: BlockDef = {
  type: 'palette',
  category: 'color',
  friendlyName: 'Palette',
  icon: 'Palette',
  description: 'Map the scalar d to a 2-colour gradient.',
  params: {
    colorA: {
      kind: 'color',
      default: [0, 0.4, 1] as const,
      label: 'colour A',
      animatable: true,
    },
    colorB: {
      kind: 'color',
      default: [1, 0.2, 0.6] as const,
      label: 'colour B',
      animatable: true,
    },
  },
  glsl: 'col = mix({{colorA}}, {{colorB}}, clamp(d, 0.0, 1.0));',
};
