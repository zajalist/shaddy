import type { CardDef } from '../types';

export const RING: CardDef = {
  type: 'ring',
  category: 'shape',
  friendlyName: 'Ring',
  description: 'Annulus — a ring at a given radius with a soft thickness.',
  icon: '◯',
  params: {
    radius: { kind: 'float', label: 'radius', default: 0.5, min: 0, max: 2, step: 0.01 },
    thickness: { kind: 'float', label: 'thickness', default: 0.08, min: 0.005, max: 1, step: 0.005 },
  },
  snippetTemplate: 'd = smoothstep({{thickness}}, 0.0, abs(length(uv) - {{radius}}));',
};
