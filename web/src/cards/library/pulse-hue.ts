import type { CardDef } from '../types';

export const PULSE_HUE: CardDef = {
  type: 'pulse_hue',
  category: 'effect',
  friendlyName: 'Pulse hue',
  description: 'Rotate hue back-and-forth over time.',
  icon: '🌈',
  params: {
    bpm: { kind: 'float', label: 'bpm', default: 60, min: 1, max: 400, step: 1 },
    depth: { kind: 'float', label: 'depth', default: 0.1, min: 0, max: 1, step: 0.005 },
  },
  snippetTemplate: `{
    vec3 _hsv = rgb2hsv(col);
    _hsv.x = fract(_hsv.x + sin(u_time * {{bpm}} / 60.0 * 6.2832) * {{depth}});
    col = hsv2rgb(_hsv);
  }`,
  helpers: ['rgb2hsv', 'hsv2rgb'],
};
