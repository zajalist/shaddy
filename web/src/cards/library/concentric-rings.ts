import type { CardDef } from '../types';

export const CONCENTRIC_RINGS: CardDef = {
  type: 'concentric_rings',
  category: 'shape',
  friendlyName: 'Concentric rings',
  description: 'Onion-skin rings from origin.',
  icon: '◎',
  params: {
    spacing: { kind: 'float', label: 'spacing', default: 0.08, min: 0.005, max: 0.5, step: 0.005 },
    sharpness: { kind: 'float', label: 'sharpness', default: 0.5, min: 0.05, max: 1, step: 0.01 },
  },
  snippetTemplate: 'd = pow(0.5 + 0.5 * sin(length(uv) / {{spacing}} * 6.2832), 1.0 / {{sharpness}});',
};
