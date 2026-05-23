import type { CardDef } from '../types';

export const RIPPLE: CardDef = {
  type: 'ripple',
  category: 'distortion',
  friendlyName: 'Ripple',
  description: 'Sin-distort the running scalar to produce concentric bands.',
  icon: '🌊',
  params: {
    frequency: { kind: 'float', label: 'frequency', default: 8, min: 0, max: 30, step: 0.1 },
    amplitude: { kind: 'float', label: 'amplitude', default: 1, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: 'd = mix(d, sin(d * {{frequency}}) * 0.5 + 0.5, {{amplitude}});',
};
