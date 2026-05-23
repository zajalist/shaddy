import type { CardDef } from '../types';

export const RADIAL_GRADIENT: CardDef = {
  type: 'radial_gradient',
  category: 'shape',
  friendlyName: 'Radial gradient',
  description: 'Smooth distance falloff from the canvas center. Run a colour card after this to actually see it.',
  icon: '🟢',
  params: {
    softness: { kind: 'float', label: 'softness', default: 1, min: 0.1, max: 3, step: 0.05 },
  },
  snippetTemplate: 'd = 1.0 - clamp(length(uv) * {{softness}}, 0.0, 1.0);',
};
