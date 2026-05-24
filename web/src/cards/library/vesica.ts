// Vesica piscis — two-circle intersection lens (iq's sdfVesica).

import type { CardDef } from '../types';

export const VESICA: CardDef = {
  type: 'vesica',
  category: 'shape',
  friendlyName: 'Vesica',
  description: 'Two-circle intersection lens shape.',
  icon: '🟢',
  params: {
    radius: { kind: 'float', label: 'radius', default: 0.7, min: 0.05, max: 2, step: 0.01 },
    separation: { kind: 'float', label: 'separation', default: 0.35, min: 0, max: 1.5, step: 0.01 },
    softness: { kind: 'float', label: 'softness', default: 0.02, min: 0, max: 0.5, step: 0.005 },
  },
  snippetTemplate:
    'd = 1.0 - smoothstep(-{{softness}}, {{softness}}, sdfVesica(uv, {{radius}}, {{separation}}));',
  helpers: ['sdfVesica'],
};
