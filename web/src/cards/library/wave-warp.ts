import type { CardDef } from '../types';

// Sinusoidal UV displacement. Place above a shape card.

export const WAVE_WARP: CardDef = {
  type: 'wave_warp',
  category: 'distortion',
  friendlyName: 'Wave-warp',
  description: 'Displace UV space along a sine. Place above a shape card.',
  icon: '〰️',
  params: {
    frequency: { kind: 'float', label: 'frequency', default: 5, min: 0, max: 25, step: 0.1 },
    amplitude: { kind: 'float', label: 'amplitude', default: 0.1, min: 0, max: 1, step: 0.005 },
  },
  snippetTemplate: 'uv += vec2(sin(uv.y * {{frequency}}), sin(uv.x * {{frequency}})) * {{amplitude}};',
};
