import type { CardDef } from '../types';

export const PALETTE: CardDef = {
  type: 'palette',
  category: 'color',
  friendlyName: 'Palette',
  description: 'Map the running scalar to a 2-colour gradient.',
  icon: '🎨',
  params: {
    color_a: { kind: 'color', label: 'colour a', default: [0.07, 0.09, 0.14] },
    color_b: { kind: 'color', label: 'colour b', default: [0.95, 0.55, 0.28] },
  },
  snippetTemplate: 'col = mix({{color_a}}, {{color_b}}, clamp(d, 0.0, 1.0));',
};
