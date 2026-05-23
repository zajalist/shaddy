import type { CardDef } from '../types';

// Quantize each colour channel to N discrete levels — banded / illustrated
// look. Place after a colour card.

export const POSTERIZE: CardDef = {
  type: 'posterize',
  category: 'color',
  friendlyName: 'Posterize',
  description: 'Snap each colour channel to N discrete levels.',
  icon: '◫',
  params: {
    levels: { kind: 'float', label: 'levels', default: 4, min: 2, max: 16, step: 1 },
  },
  snippetTemplate: 'col = floor(col * {{levels}}) / ({{levels}} - 1.0);',
};
