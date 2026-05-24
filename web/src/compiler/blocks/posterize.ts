import type { BlockDef } from '../types';

export const POSTERIZE: BlockDef = {
  type: 'posterize',
  category: 'color',
  friendlyName: 'Posterize',
  icon: 'Stack',
  description: 'Snap each colour channel to N discrete levels.',
  params: {
    levels: { kind: 'number', default: 4, min: 2, max: 16, step: 1, label: 'levels', animatable: true },
  },
  glsl: 'col = floor(col * {{levels}}) / ({{levels}} - 1.0);',
};
