// Multiply col by a sin(u_time) modulation. Time-based without needing the
// animation system.

import type { CardDef } from '../types';

export const PULSE_BRIGHTNESS: CardDef = {
  type: 'pulse_brightness',
  category: 'effect',
  friendlyName: 'Pulse brightness',
  description: 'Throb brightness with a sin wave.',
  icon: '💓',
  params: {
    bpm: { kind: 'float', label: 'bpm', default: 90, min: 1, max: 400, step: 1 },
    depth: { kind: 'float', label: 'depth', default: 0.3, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate:
    'col *= 1.0 - {{depth}} * (0.5 - 0.5 * sin(u_time * {{bpm}} / 60.0 * 6.2832));',
};
